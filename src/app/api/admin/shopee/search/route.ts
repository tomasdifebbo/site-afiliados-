import { NextRequest, NextResponse } from "next/server";
import { searchProductOffers, ShopeeApiError } from "@/lib/shopee";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || undefined;
    const sortType = parseInt(searchParams.get("sortType") || "2", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const result = await searchProductOffers({
      keyword,
      sortType,
      page,
      limit,
    });

    const itemIds = result.nodes.map((n) => String(n.itemId));
    const names = result.nodes.map((n) => n.productName.trim().toLowerCase());

    // Check existing in DB to mark alreadyImported
    const existing = await prisma.product.findMany({
      where: {
        OR: [
          { itemId: { in: itemIds } },
          { name: { in: names } },
        ],
      },
      select: {
        id: true,
        itemId: true,
        name: true,
        category: { select: { name: true, slug: true } },
      },
    });

    const existingItemIds = new Set(existing.map((e) => e.itemId).filter(Boolean));
    const existingNames = new Set(existing.map((e) => e.name.trim().toLowerCase()));

    const enrichedNodes = result.nodes.map((node) => {
      const isImported =
        existingItemIds.has(String(node.itemId)) ||
        existingNames.has(node.productName.trim().toLowerCase());

      return {
        ...node,
        alreadyImported: isImported,
      };
    });

    return NextResponse.json({
      success: true,
      nodes: enrichedNodes,
      pageInfo: result.pageInfo,
    });
  } catch (error: any) {
    console.error("Erro na busca da Shopee API:", error);
    if (error instanceof ShopeeApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }
    return NextResponse.json({ error: error.message || "Erro interno ao buscar na Shopee API." }, { status: 500 });
  }
}
