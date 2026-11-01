import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchProductOffers } from "@/lib/shopee";
import {
  generateSingleItemNarration,
  buildFormattedScript,
} from "@/lib/geminiTechZoneScript";
import {
  generateDescription,
  generateTags,
} from "@/app/api/admin/youtube/generate-script/route";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productToRemove,
      currentProductIds = [],
      currentProductSlugs = [],
      positionIndex = 0,
      siteUrl = "https://achadinhosdodia.com.br",
      theme = "10 Achadinhos Incríveis da Shopee",
      allProducts = [],
      techZoneData,
      apiKey,
    } = body;

    if (!productToRemove) {
      return NextResponse.json(
        { error: "Produto a ser removido não especificado." },
        { status: 400 }
      );
    }

    // Coleta todos os IDs e Slugs para garantir que o substituto seja 100% inédito
    const excludedIds: string[] = [
      ...currentProductIds,
      productToRemove.id,
    ].filter(Boolean);

    const excludedSlugs: string[] = [
      ...currentProductSlugs,
      productToRemove.slug,
    ].filter(Boolean);

    let candidate = null;
    let targetCategoryId = productToRemove.categoryId;

    // 1. Se não tiver categoryId diretamente no objeto, busca o produto no banco para achar a categoria
    if (!targetCategoryId && (productToRemove.id || productToRemove.slug)) {
      const orig = await prisma.product.findFirst({
        where: {
          OR: [
            productToRemove.id ? { id: productToRemove.id } : undefined,
            productToRemove.slug ? { slug: productToRemove.slug } : undefined,
          ].filter(Boolean) as any,
        },
        include: { category: true },
      });
      if (orig?.categoryId) {
        targetCategoryId = orig.categoryId;
      }
    }

    // 2. Busca na mesma categoria por maior número de vendas e avaliações positivas
    if (targetCategoryId) {
      candidate = await prisma.product.findFirst({
        where: {
          categoryId: targetCategoryId,
          id: { notIn: excludedIds },
          slug: { notIn: excludedSlugs },
          price: { gt: 0 },
          imageUrl: { not: "" },
        },
        include: { category: true },
        orderBy: [
          { sales: "desc" },
          { ratingStar: "desc" },
        ],
      });
    }

    // 3. Se não achou na categoria ou não havia categoryId, busca por nome da categoria
    if (!candidate && productToRemove.categoryName) {
      const cat = await prisma.category.findFirst({
        where: {
          name: { contains: productToRemove.categoryName },
        },
      });
      if (cat) {
        candidate = await prisma.product.findFirst({
          where: {
            categoryId: cat.id,
            id: { notIn: excludedIds },
            slug: { notIn: excludedSlugs },
            price: { gt: 0 },
            imageUrl: { not: "" },
          },
          include: { category: true },
          orderBy: [
            { sales: "desc" },
            { ratingStar: "desc" },
          ],
        });
      }
    }

    // 3.5. Busca na Shopee Live Search API pelo mesmo gênero / categoria
    if (!candidate && (productToRemove.categoryName || productToRemove.name)) {
      try {
        const kw = productToRemove.categoryName || productToRemove.name.split(" ").slice(0, 3).join(" ");
        const liveRes = await searchProductOffers({ keyword: kw, sortType: 2, limit: 10 });
        const liveCandidate = (liveRes.nodes || []).find(
          (n) => !excludedIds.includes(String(n.itemId)) && !excludedSlugs.includes(String(n.itemId))
        );
        if (liveCandidate) {
          const priceNum = parseFloat(liveCandidate.price) || 0;
          candidate = {
            id: String(liveCandidate.itemId),
            slug: String(liveCandidate.itemId),
            categoryId: targetCategoryId || "shopee-live",
            category: { name: productToRemove.categoryName || "Achadinhos" },
            name: liveCandidate.productName,
            price: priceNum,
            ratingStar: parseFloat(liveCandidate.ratingStar) || 4.8,
            sales: liveCandidate.sales || 0,
            discountRate: liveCandidate.priceDiscountRate || null,
            imageUrl: liveCandidate.imageUrl,
            affiliateLink: liveCandidate.offerLink || liveCandidate.productLink,
          } as any;
        }
      } catch {}
    }

    // 4. Se ainda não achou, busca por palavra-chave do produto no banco
    if (!candidate && productToRemove.name) {
      const words = productToRemove.name
        .split(/\s+/)
        .filter((w: string) => w.length >= 4)
        .slice(0, 3);

      for (const word of words) {
        candidate = await prisma.product.findFirst({
          where: {
            name: { contains: word },
            id: { notIn: excludedIds },
            slug: { notIn: excludedSlugs },
            price: { gt: 0 },
            imageUrl: { not: "" },
          },
          include: { category: true },
          orderBy: [{ sales: "desc" }, { ratingStar: "desc" }],
        });
        if (candidate) break;
      }
    }

    // 5. Fallback final: Top vendas geral que não esteja na lista
    if (!candidate) {
      candidate = await prisma.product.findFirst({
        where: {
          id: { notIn: excludedIds },
          slug: { notIn: excludedSlugs },
          price: { gt: 0 },
          imageUrl: { not: "" },
        },
        include: { category: true },
        orderBy: [{ sales: "desc" }, { ratingStar: "desc" }],
      });
    }

    if (!candidate) {
      return NextResponse.json(
        { error: "Nenhum outro produto substituto elegível encontrado." },
        { status: 404 }
      );
    }

    // Objeto formatado do novo produto
    const replacement = {
      id: candidate.id,
      slug: candidate.slug,
      categoryId: candidate.categoryId,
      categoryName: candidate.category?.name || "Achadinhos",
      name: candidate.name,
      price: candidate.price,
      ratingStar: candidate.ratingStar,
      sales: candidate.sales,
      discountRate: candidate.discountRate,
      imageUrl: candidate.imageUrl,
      link: `${siteUrl}/go/${candidate.slug}?origin=youtube_dark`,
    };

    // Gera a narração e gancho estilo TechZone para o novo produto
    const pos = positionIndex + 1;
    const newTechZoneItem = await generateSingleItemNarration({
      product: replacement,
      pos,
      categoryName: replacement.categoryName,
      apiKey,
    });

    // Atualiza a lista completa de produtos
    const updatedProducts = [...allProducts];
    if (positionIndex >= 0 && positionIndex < updatedProducts.length) {
      updatedProducts[positionIndex] = replacement;
    } else {
      updatedProducts.push(replacement);
    }

    // Atualiza a lista de itens TechZone
    const existingItems = techZoneData?.items || [];
    const updatedItems = [...existingItems];
    if (positionIndex >= 0 && positionIndex < updatedItems.length) {
      updatedItems[positionIndex] = newTechZoneItem;
    } else {
      updatedItems.push(newTechZoneItem);
    }

    // Reconstrói a descrição oficial do YouTube com o novo link
    const updatedDescription = generateDescription({
      title: theme || "10 Achadinhos Incríveis da Shopee",
      products: updatedProducts,
      siteUrl,
    });

    // Reconstrói o roteiro completo formatado
    const formattedScriptObj = buildFormattedScript({
      theme: theme || "Achadinhos Incríveis da Shopee",
      siteUrl,
      products: updatedProducts,
      intro:
        techZoneData?.introNarration ||
        "E aí pessoal, sejam muito bem-vindos! Garimpamos os melhores achadinhos.",
      championPos: (techZoneData?.championProductIndex ?? 0) + 1,
      items: updatedItems.map((it: any, idx: number) => ({
        pos: idx + 1,
        shortName: it.shortName,
        hook: it.hook,
        narration: it.narration,
        isChampion: it.isChampion,
        isBestValue: it.isBestValue,
      })),
      outro:
        techZoneData?.outroNarration ||
        "E aí, qual desses achadinhos você levaria pra casa hoje? Comenta aqui embaixo!",
    });

    const updatedTags = generateTags(updatedProducts, theme);

    return NextResponse.json({
      success: true,
      replacement,
      techZoneItem: newTechZoneItem,
      updatedProducts,
      updatedDescription,
      fullScript: formattedScriptObj.formattedFullScript,
      techZoneData: {
        introNarration: techZoneData?.introNarration,
        outroNarration: techZoneData?.outroNarration,
        championProductIndex: techZoneData?.championProductIndex ?? 0,
        items: formattedScriptObj.items,
      },
      tags: updatedTags,
      categoryName: replacement.categoryName,
    });
  } catch (err: any) {
    console.error("Erro ao substituir produto:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao substituir produto" },
      { status: 500 }
    );
  }
}
