import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { offerToProductData, searchProductOffers, ShopeeProductOffer } from "@/lib/shopee";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categorySlug, items, autoFetch, keyword, sortType, limit } = body;

    // 1. Resolve Target Category
    let targetCategory = null;
    if (categorySlug) {
      targetCategory = await prisma.category.findUnique({ where: { slug: categorySlug } });
    }
    if (!targetCategory) {
      targetCategory = await prisma.category.findFirst({ where: { slug: "eletrodomesticos" } }) ||
                       await prisma.category.findFirst({ where: { slug: "saude" } }) ||
                       await prisma.category.findFirst();
    }
    if (!targetCategory) {
      return NextResponse.json({ error: "Nenhuma categoria cadastrada no site." }, { status: 400 });
    }

    let offersToProcess: ShopeeProductOffer[] = [];

    if (autoFetch && keyword) {
      const searchRes = await searchProductOffers({
        keyword,
        sortType: sortType || 2,
        limit: Math.min(50, Math.max(1, limit || 20)),
      });
      offersToProcess = searchRes.nodes;
    } else if (Array.isArray(items) && items.length > 0) {
      offersToProcess = items;
    } else {
      return NextResponse.json({ error: "Nenhum produto enviado para importação." }, { status: 400 });
    }

    if (offersToProcess.length === 0) {
      return NextResponse.json({ error: "Nenhuma oferta encontrada para importar." }, { status: 404 });
    }

    // 2. Query existing products in DB to prevent duplicates (by itemId and normalized name)
    const itemIds = offersToProcess.map((o) => String(o.itemId)).filter(Boolean);
    const names = offersToProcess.map((o) => o.productName.trim().toLowerCase());

    const existingInDb = await prisma.product.findMany({
      where: {
        OR: [
          { itemId: { in: itemIds } },
          { name: { in: names } },
        ],
      },
      select: {
        itemId: true,
        name: true,
      },
    });

    const existingItemIds = new Set(existingInDb.map((e) => e.itemId).filter(Boolean));
    const existingNames = new Set(existingInDb.map((e) => e.name.trim().toLowerCase()));

    // 3. Filter and prepare data
    const seenBatchItemIds = new Set<string>();
    const seenBatchNames = new Set<string>();

    const preparedData: any[] = [];
    let skippedCount = 0;

    for (const offer of offersToProcess) {
      const strItemId = String(offer.itemId);
      const normName = offer.productName.trim().toLowerCase();

      if (
        existingItemIds.has(strItemId) ||
        existingNames.has(normName) ||
        seenBatchItemIds.has(strItemId) ||
        seenBatchNames.has(normName)
      ) {
        skippedCount++;
        continue;
      }

      seenBatchItemIds.add(strItemId);
      seenBatchNames.add(normName);

      const baseData = offerToProductData(offer);
      preparedData.push({
        ...baseData,
        categoryId: targetCategory.id,
        isFeatured: Math.random() > 0.85,
      });
    }

    if (preparedData.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        skippedCount,
        message: "Todos os produtos selecionados já estavam cadastrados no site.",
        categoryName: targetCategory.name,
      });
    }

    // 4. Fast Chunked Batch Insertion
    const chunkSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < preparedData.length; i += chunkSize) {
      const chunk = preparedData.slice(i, i + chunkSize);
      const res = await prisma.product.createMany({
        data: chunk,
      });
      totalInserted += res.count;
    }

    return NextResponse.json({
      success: true,
      count: totalInserted,
      skippedCount,
      categoryName: targetCategory.name,
      categorySlug: targetCategory.slug,
    });
  } catch (error: any) {
    console.error("Erro na importação via Shopee API:", error);
    return NextResponse.json({ error: error.message || "Erro interno ao salvar os produtos." }, { status: 500 });
  }
}
