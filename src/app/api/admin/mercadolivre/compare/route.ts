import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findBestMatch, isMercadoLivreConfigured, MIN_MATCH_SCORE } from "@/lib/mercadolivre";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET /api/admin/mercadolivre/compare
 * Status da comparação: quantos produtos já foram verificados / casados.
 */
export async function GET() {
  const [total, checked, matchedRows] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { mlCheckedAt: { not: null } } }),
    // Prisma não compara duas colunas no where; conta em memória só os casados
    prisma.product.findMany({ where: { mlPrice: { not: null } }, select: { price: true, mlPrice: true } }),
  ]);
  const matched = matchedRows.length;
  const mlCheaper = matchedRows.filter((r) => r.price && r.mlPrice && r.mlPrice < r.price).length;

  return NextResponse.json({
    configured: isMercadoLivreConfigured(),
    affiliateTag: Boolean(process.env.ML_AFFILIATE_TAG || process.env.ML_AFFILIATE_TOOL),
    minScore: MIN_MATCH_SCORE,
    total,
    checked,
    matched,
    mlCheaper,
  });
}

/**
 * POST /api/admin/mercadolivre/compare
 * Body: { limit?: number (1-50), productIds?: string[], featuredOnly?: boolean, force?: boolean }
 *
 * Processa um lote: para cada produto da Shopee busca o equivalente no Mercado Livre
 * e grava preço + link. Prioriza destaques e mais vendidos que ainda não foram verificados.
 */
export async function POST(req: NextRequest) {
  if (!isMercadoLivreConfigured()) {
    return NextResponse.json(
      { success: false, error: "Defina ML_CLIENT_ID e ML_CLIENT_SECRET no .env e reinicie o servidor." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(50, Math.max(1, Number(body?.limit) || 20));
  const productIds: string[] | undefined = Array.isArray(body?.productIds) ? body.productIds : undefined;
  const force = body?.force === true;

  const where: any = {};
  if (productIds?.length) where.id = { in: productIds };
  else {
    if (!force) where.mlCheckedAt = null;
    if (body?.featuredOnly) where.isFeatured = true;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { sales: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, name: true, price: true },
  });

  const details: any[] = [];
  let matched = 0;

  for (const p of products) {
    try {
      const match = await findBestMatch(p.name, p.price);
      await prisma.product.update({
        where: { id: p.id },
        data: match
          ? {
              mlItemId: match.id,
              mlTitle: match.title,
              mlPrice: match.price,
              mlLink: match.permalink,
              mlMatchScore: match.score,
              mlCheckedAt: new Date(),
            }
          : {
              mlItemId: null,
              mlTitle: null,
              mlPrice: null,
              mlLink: null,
              mlMatchScore: null,
              mlCheckedAt: new Date(),
            },
      });

      if (match) matched++;
      details.push({
        id: p.id,
        name: p.name,
        shopeePrice: p.price,
        status: match ? "matched" : "not_found",
        ml: match ? { title: match.title, price: match.price, score: match.score, link: match.permalink } : null,
      });
    } catch (e: any) {
      details.push({ id: p.id, name: p.name, status: "error", error: e.message });
      // Bloqueio/limite do ML: para o lote para não queimar requisições
      if (e.status === 401 || e.status === 403 || e.status === 429) {
        return NextResponse.json({
          success: false,
          error: e.message,
          processed: details.length,
          matched,
          details,
        }, { status: e.status === 429 ? 429 : 502 });
      }
    }
    await sleep(250); // respeita o rate limit do ML
  }

  const remaining = await prisma.product.count({ where: { mlCheckedAt: null } });

  return NextResponse.json({ success: true, processed: details.length, matched, remaining, details });
}

/**
 * PATCH /api/admin/mercadolivre/compare
 * Body: { productId, mlAffiliateLink?: string | null, clear?: boolean }
 * Ajuste manual: colar link do gerador de afiliados ML ou remover um match errado.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body?.productId) {
    return NextResponse.json({ success: false, error: "productId obrigatório" }, { status: 400 });
  }

  const data: any = body.clear
    ? { mlItemId: null, mlTitle: null, mlPrice: null, mlLink: null, mlAffiliateLink: null, mlMatchScore: null }
    : { mlAffiliateLink: body.mlAffiliateLink || null };

  const product = await prisma.product.update({ where: { id: body.productId }, data });
  return NextResponse.json({ success: true, product });
}
