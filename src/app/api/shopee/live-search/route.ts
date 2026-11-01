import { NextRequest, NextResponse } from "next/server";
import { searchProductOffers, ShopeeApiError } from "@/lib/shopee";

export const dynamic = "force-dynamic";

/**
 * 🔍 BUSCA PÚBLICA DIRETO DA SHOPEE COM CONVERSÃO AUTOMÁTICA EM LINK DE AFILIADO
 * Quando o visitante busca qualquer produto no site:
 * 1. Pesquisa em tempo real na Open API da Shopee Brasil
 * 2. Retorna os produtos ranqueados por vendas/relevância
 * 3. Cada produto já vem com seu link de afiliado oficial (offerLink)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const sort = parseInt(searchParams.get("sort") || "2", 10); // 2 = mais vendidos
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(36, Math.max(1, parseInt(searchParams.get("limit") || "18", 10)));

    if (!q) {
      return NextResponse.json({
        success: true,
        products: [],
        total: 0,
        pageInfo: { page: 1, limit, hasNextPage: false },
      });
    }

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
    });
  } catch (error: any) {
    console.error("Erro na busca direta da Shopee:", error);
    if (error instanceof ShopeeApiError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Não foi possível consultar os produtos da Shopee no momento." },
      { status: 500 }
    );
  }
}
