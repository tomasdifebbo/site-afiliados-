import { NextRequest, NextResponse } from "next/server";
import { searchProductOffers, ShopeeApiError } from "@/lib/shopee";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 🔍 BUSCA PÚBLICA DIRETO DA SHOPEE COM FALLBACK INTELIGENTE NO BANCO LOCAL
 * 1. Tenta buscar em tempo real na Open API da Shopee
 * 2. Se a API da Shopee estiver instável ou sem credenciais na Vercel (System Error 10000):
 *    Busca instantaneamente entre os 12.760 produtos do catálogo local!
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const sort = parseInt(searchParams.get("sort") || "2", 10); // 2 = mais vendidos
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(36, Math.max(1, parseInt(searchParams.get("limit") || "18", 10)));
  const skip = (page - 1) * limit;

  if (!q) {
    return NextResponse.json({
      success: true,
      products: [],
      total: 0,
      pageInfo: { page: 1, limit, hasNextPage: false },
    });
  }

  // Tentativa 1: Busca ao vivo na Open API da Shopee
  try {
    const result = await searchProductOffers({
      keyword: q,
      sortType: sort,
      page,
      limit,
    });

    const products = (result.nodes || []).map((node) => {
      const priceNum = parseFloat(node.price) || 0;
      const originalPriceNum = node.priceMax ? parseFloat(node.priceMax) : null;
      const discount = node.priceDiscountRate || (originalPriceNum && originalPriceNum > priceNum
        ? Math.round((1 - priceNum / originalPriceNum) * 100)
        : null);

      return {
        id: String(node.itemId),
        itemId: String(node.itemId),
        shopId: String(node.shopId),
        name: node.productName,
        price: priceNum,
        originalPrice: originalPriceNum,
        discountRate: discount,
        imageUrl: node.imageUrl,
        affiliateLink: node.offerLink || node.productLink,
        sales: node.sales || 0,
        ratingStar: parseFloat(node.ratingStar) || 4.8,
        shopName: node.shopName || "Shopee Oficial",
        isLiveShopee: true,
      };
    });

    return NextResponse.json({
      success: true,
      keyword: q,
      products,
      total: products.length,
      pageInfo: result.pageInfo,
      source: "shopee_api",
    });
  } catch (error: any) {
    console.warn("[LiveSearch] Shopee API falhou, acionando busca inteligente no banco local:", error.message);

    // Tentativa 2 (Fallback Instantâneo): Busca no banco local SQLite
    try {
      const words = q.split(/\s+/).filter(w => w.length > 1);
      const whereCondition = {
        AND: words.map(w => ({
          name: { contains: w }
        }))
      };

      const [localTotal, localProducts] = await Promise.all([
        prisma.product.count({ where: whereCondition }),
        prisma.product.findMany({
          where: whereCondition,
          orderBy: [{ sales: "desc" }, { createdAt: "desc" }],
          skip,
          take: limit,
        }),
      ]);

      const formattedLocal = localProducts.map((p) => ({
        id: p.id,
        itemId: p.itemId || p.id,
        shopId: p.shopId || "",
        name: p.name,
        price: p.price || 0,
        originalPrice: p.price && p.discountRate ? +(p.price / (1 - p.discountRate / 100)).toFixed(2) : null,
        discountRate: p.discountRate || null,
        imageUrl: p.imageUrl,
        affiliateLink: `/go/${p.slug}?origin=search`,
        sales: p.sales || 120,
        ratingStar: p.ratingStar || 4.8,
        shopName: "Shopee Oficial",
        isLiveShopee: false,
      }));

      return NextResponse.json({
        success: true,
        keyword: q,
        products: formattedLocal,
        total: localTotal,
        pageInfo: {
          page,
          limit,
          hasNextPage: skip + localProducts.length < localTotal,
        },
        source: "local_database",
      });
    } catch (dbErr: any) {
      console.error("[LiveSearch] Erro ao buscar no banco local:", dbErr);
      return NextResponse.json({
        success: false,
        error: "Nenhum resultado encontrado para essa busca.",
      }, { status: 404 });
    }
  }
}
