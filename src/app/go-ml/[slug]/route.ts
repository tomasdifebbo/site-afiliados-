import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { buildMercadoLivreAffiliateUrl } from "@/lib/mercadolivre";

/** Redireciona para o anúncio equivalente no Mercado Livre (com link de afiliado) e registra o clique. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, mlLink: true, mlAffiliateLink: true },
  });

  if (!product || (!product.mlLink && !product.mlAffiliateLink)) {
    return NextResponse.redirect(new URL(`/produto/${slug}`, request.url));
  }

  const origin = request.nextUrl.searchParams.get("origin") || "direct";
  const device = /mobile/i.test(request.headers.get("user-agent") || "") ? "mobile" : "desktop";

  prisma.click
    .create({ data: { productId: product.id, origin: `ml_${origin}`, device } })
    .catch((err: Error) => console.error("Tracking Error (ML):", err));

  return NextResponse.redirect(buildMercadoLivreAffiliateUrl(product.mlLink || "", product.mlAffiliateLink));
}
