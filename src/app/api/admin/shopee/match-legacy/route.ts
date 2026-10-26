import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchProductOffers } from "@/lib/shopee";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(20, Math.max(1, typeof body?.limit === "number" ? body.limit : 5));

    // Buscar produtos antigos sem itemId
    const legacyProducts = await prisma.product.findMany({
      where: { itemId: null },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    if (legacyProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum produto pendente de vinculação encontrado.",
        matched: 0,
        unmatched: 0,
        total: 0,
      });
    }

    let matchedCount = 0;
    let unmatchedCount = 0;
    const results = [];

    for (const prod of legacyProducts) {
      // Limpar nome para busca mais efetiva (primeiras 5-8 palavras)
      const cleanKeyword = prod.name
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 6)
        .join(" ");

      if (!cleanKeyword) {
        unmatchedCount++;
        continue;
      }

      try {
        const searchRes = await searchProductOffers({
          keyword: cleanKeyword,
          limit: 3,
          sortType: 1, // relevância
        });

        if (searchRes.nodes && searchRes.nodes.length > 0) {
          const bestMatch = searchRes.nodes[0];
          const bestItemId = String(bestMatch.itemId);

          // Verificar se já não existe outro produto usando este itemId
          const exists = await prisma.product.findUnique({
            where: { itemId: bestItemId },
          });

          if (!exists) {
            await prisma.product.update({
              where: { id: prod.id },
              data: {
                itemId: bestItemId,
                shopId: String(bestMatch.shopId),
                commissionRate: parseFloat(bestMatch.commissionRate) || null,
                sales: typeof bestMatch.sales === "number" ? bestMatch.sales : null,
                ratingStar: parseFloat(bestMatch.ratingStar) || null,
                discountRate: typeof bestMatch.priceDiscountRate === "number" ? bestMatch.priceDiscountRate : null,
                priceUpdatedAt: new Date(),
              },
            });

            matchedCount++;
            results.push({
              productId: prod.id,
              originalName: prod.name,
              matchedName: bestMatch.productName,
              itemId: bestItemId,
              commissionRate: bestMatch.commissionRate,
            });
            continue;
          }
        }

        unmatchedCount++;
      } catch (err) {
        console.error(`Erro ao buscar correspondência para "${prod.name}":`, err);
        unmatchedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total: legacyProducts.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      results,
    });
  } catch (error: any) {
    console.error("Erro no match-legacy Shopee:", error);
    return NextResponse.json(
      { error: "Falha na vinculação de produtos legados", details: error.message },
      { status: 500 }
    );
  }
}
