import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { buildMercadoLivreAffiliateUrl } from "@/lib/mercadolivre";

/** Redireciona para o anúncio equivalente no Mercado Livre (com link de afiliado) e registra o clique. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, name: true, mlLink: true, mlAffiliateLink: true },
  });

  if (!product) {
    try {
      const decodedSlug = decodeURIComponent(slug);
      product = await prisma.product.findFirst({
        where: {
          OR: [
            { slug: decodedSlug },
            { itemId: slug },
            { id: slug },
          ],
        },
        select: { id: true, name: true, mlLink: true, mlAffiliateLink: true },
      });
    } catch {}
  }

  // Se mesmo assim não encontrar registro no banco, monta a busca do ML direto com o slug
  let targetUrl = product?.mlAffiliateLink || product?.mlLink;
  if (!targetUrl) {
    const cleanQuery = slug
      .replace(/^(kit \d+x?|par de|jogo de|mini|super)\s+/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    targetUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(cleanQuery)}`;
  }

  const origin = request.nextUrl.searchParams.get("origin") || "direct";
  const device = /mobile/i.test(request.headers.get("user-agent") || "") ? "mobile" : "desktop";

  if (product) {
    prisma.click
      .create({ data: { productId: product.id, origin: `ml_${origin}`, device } })
      .catch((err: Error) => console.error("Tracking Error (ML):", err));
  }

  return NextResponse.redirect(buildMercadoLivreAffiliateUrl(targetUrl, product?.mlAffiliateLink));
}
