import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { buildMercadoLivreAffiliateUrl, findBestMatch } from "@/lib/mercadolivre";

/** Redireciona para o anúncio equivalente no Mercado Livre (com link de afiliado) e registra o clique. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, name: true, price: true, mlLink: true, mlAffiliateLink: true },
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
            { name: { contains: decodedSlug } },
          ],
        },
        select: { id: true, name: true, price: true, mlLink: true, mlAffiliateLink: true },
      });
    } catch {}
  }

  let targetUrl = product?.mlAffiliateLink || product?.mlLink;
  const isDirectProduct = Boolean(
    targetUrl && (targetUrl.includes("/p/MLB") || targetUrl.includes("produto.mercadolivre.com.br"))
  );

  // Se não temos o link direto do produto (ou se ainda apontava para busca lista.mercadolivre),
  // localiza automaticamente a página do produto no catálogo do Mercado Livre
  if (!isDirectProduct) {
    const searchName = product?.name || decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
    try {
      const match = await findBestMatch(searchName, product?.price);
      if (match?.permalink) {
        targetUrl = match.permalink;
        // Grava no banco para que futuros acessos ao mesmo produto sejam instantâneos
        if (product) {
          prisma.product
            .update({
              where: { id: product.id },
              data: { mlLink: targetUrl, mlItemId: match.id, mlTitle: match.title },
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar produto direto no ML:", e);
    }
  }

  // Fallback caso a API não localize nenhum produto equivalente no catálogo
  if (!targetUrl) {
    const cleanQuery = (product?.name || slug)
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
