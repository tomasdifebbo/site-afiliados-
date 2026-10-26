import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConversionReport } from "@/lib/shopee";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get("days") || "30", 10);
    const days = [7, 15, 30, 60, 90].includes(daysParam) ? daysParam : 30;

    const now = Math.floor(Date.now() / 1000);
    const startTime = now - days * 24 * 3600;
    const startDate = new Date(startTime * 1000);

    // 1. Buscar relatório de conversões oficiais da Shopee
    let shopeeReport;
    try {
      shopeeReport = await getConversionReport({
        purchaseTimeStart: startTime,
        purchaseTimeEnd: now,
        limit: 50,
      });
    } catch (apiErr: any) {
      console.warn("Shopee API conversionReport warning:", apiErr.message);
      shopeeReport = { nodes: [], pageInfo: { page: 1, limit: 50, hasNextPage: false, scrollId: "" } };
    }

    // 2. Buscar cliques registrados localmente no banco para o mesmo período
    const totalLocalClicks = await prisma.click.count({
      where: {
        timestamp: { gte: startDate },
      },
    });

    const topClickedProducts = await prisma.click.groupBy({
      by: ["productId"],
      where: {
        timestamp: { gte: startDate },
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: "desc",
        },
      },
      take: 5,
    });

    // Enriquecer os top produtos clicados com nome e imagem
    const productDetails = await prisma.product.findMany({
      where: {
        id: { in: topClickedProducts.map(p => p.productId) },
      },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        commissionRate: true,
      },
    });

    const topProductsWithData = topClickedProducts.map(p => {
      const prod = productDetails.find(d => d.id === p.productId);
      return {
        id: p.productId,
        name: prod?.name || "Produto não identificado",
        price: prod?.price || 0,
        imageUrl: prod?.imageUrl || "",
        commissionRate: prod?.commissionRate || null,
        clicks: p._count.productId,
      };
    });

    // 3. Agregar métricas de comissão da Shopee
    const conversions = shopeeReport.nodes || [];
    let totalEstimatedCommission = 0;
    let totalConfirmedCommission = 0;

    for (const conv of conversions) {
      totalEstimatedCommission += parseFloat(conv.estimatedTotalCommission) || 0;
      totalConfirmedCommission += parseFloat(conv.totalCommission || conv.netCommission) || 0;
    }

    const conversionRate = totalLocalClicks > 0
      ? ((conversions.length / totalLocalClicks) * 100).toFixed(2)
      : "0.00";

    return NextResponse.json({
      success: true,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date(now * 1000).toISOString(),
      },
      metrics: {
        totalClicks: totalLocalClicks,
        totalOrders: conversions.length,
        totalEstimatedCommission: Number(totalEstimatedCommission.toFixed(2)),
        totalConfirmedCommission: Number(totalConfirmedCommission.toFixed(2)),
        conversionRatePercent: parseFloat(conversionRate),
      },
      topClickedProducts: topProductsWithData,
      conversions,
    });
  } catch (error: any) {
    console.error("Erro ao gerar relatório Shopee:", error);
    return NextResponse.json(
      { error: "Falha ao gerar relatório de comissões", details: error.message },
      { status: 500 }
    );
  }
}
