import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductOfferById, ShopeeProductOffer } from "@/lib/shopee";

interface RefreshItemDetail {
  id: string;
  itemId: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  priceChanged: boolean;
  status: "updated" | "unchanged" | "unavailable" | "error";
  commissionRate?: number | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const productIds: string[] | undefined = Array.isArray(body?.productIds) ? body.productIds : undefined;
    const limit = Math.min(50, Math.max(1, typeof body?.limit === "number" ? body.limit : 20));

    // Buscar produtos elegíveis com itemId válido
    let productsToRefresh;
    if (productIds && productIds.length > 0) {
      productsToRefresh = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          itemId: { not: null },
        },
        take: limit,
      });
    } else {
      // Pega os que nunca foram atualizados ou os mais antigos
      productsToRefresh = await prisma.product.findMany({
        where: {
          itemId: { not: null },
        },
        orderBy: [
          { priceUpdatedAt: "asc" },
          { updatedAt: "asc" },
        ],
        take: limit,
      });
    }

    if (productsToRefresh.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum produto elegível para atualização (produtos precisam ter itemId da Shopee).",
        total: 0,
        updated: 0,
        unchanged: 0,
        unavailable: 0,
        details: [],
      });
    }

    const details: RefreshItemDetail[] = [];
    let updatedCount = 0;
    let unchangedCount = 0;
    let unavailableCount = 0;

    // Processar individualmente ou com pequeno delay para respeitar rate limit da Shopee
    for (const prod of productsToRefresh) {
      if (!prod.itemId) continue;

      try {
        const offer: ShopeeProductOffer | null = await getProductOfferById(prod.itemId);

        const currentPrice = prod.price ?? 0;

        if (!offer) {
          // Produto indisponível ou esgotado na Shopee
          unavailableCount++;
          await prisma.product.update({
            where: { id: prod.id },
            data: { priceUpdatedAt: new Date() },
          });

          details.push({
            id: prod.id,
            itemId: prod.itemId,
            name: prod.name,
            oldPrice: currentPrice,
            newPrice: currentPrice,
            priceChanged: false,
            status: "unavailable",
          });
          continue;
        }

        const newPrice = parseFloat(offer.priceMin || offer.price) || currentPrice;
        const newCommission = parseFloat(offer.commissionRate) || prod.commissionRate;
        const newSales = typeof offer.sales === "number" ? offer.sales : prod.sales;
        const newRating = parseFloat(offer.ratingStar) || prod.ratingStar;
        const newDiscount = typeof offer.priceDiscountRate === "number" ? offer.priceDiscountRate : prod.discountRate;
        const priceChanged = Math.abs(newPrice - currentPrice) > 0.01;

        await prisma.product.update({
          where: { id: prod.id },
          data: {
            price: newPrice,
            commissionRate: newCommission,
            sales: newSales,
            ratingStar: newRating,
            discountRate: newDiscount,
            affiliateLink: offer.offerLink || prod.affiliateLink,
            priceUpdatedAt: new Date(),
          },
        });

        if (priceChanged) {
          updatedCount++;
        } else {
          unchangedCount++;
        }

        details.push({
          id: prod.id,
          itemId: prod.itemId,
          name: prod.name,
          oldPrice: currentPrice,
          newPrice,
          priceChanged,
          status: priceChanged ? "updated" : "unchanged",
          commissionRate: newCommission,
        });

      } catch (err) {
        console.error(`Erro ao atualizar produto ID ${prod.id}:`, err);
        details.push({
          id: prod.id,
          itemId: prod.itemId,
          name: prod.name,
          oldPrice: prod.price ?? 0,
          newPrice: prod.price ?? 0,
          priceChanged: false,
          status: "error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: productsToRefresh.length,
      updated: updatedCount,
      unchanged: unchangedCount,
      unavailable: unavailableCount,
      details,
    });
  } catch (error: any) {
    console.error("Erro no refresh de produtos Shopee:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar produtos", details: error.message },
      { status: 500 }
    );
  }
}
