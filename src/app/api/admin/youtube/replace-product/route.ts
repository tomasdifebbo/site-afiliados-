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
  GENRE_CONFIGS,
} from "@/app/api/admin/youtube/generate-script/route";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productToRemove,
      currentProductIds = [],
      currentProductSlugs = [],
      positionIndex = 0,
      targetGenre,
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
      productToRemove.itemId,
    ].map(String).filter(Boolean);

    const excludedSlugs: string[] = [
      ...currentProductSlugs,
      productToRemove.slug,
      productToRemove.id,
      productToRemove.itemId,
    ].map(String).filter(Boolean);

    let candidate = null;
    let targetCategoryId = productToRemove.categoryId;
    let targetCategoryName = productToRemove.categoryName || "Achadinhos";

    // 1. Determina a palavra-chave de busca
    let searchKeyword = "";
    if (targetGenre && targetGenre !== "mesma" && GENRE_CONFIGS[targetGenre]) {
      searchKeyword = GENRE_CONFIGS[targetGenre].keywords;
      targetCategoryName = GENRE_CONFIGS[targetGenre].label;
    } else {
      searchKeyword =
        productToRemove.categoryName?.replace(/&/g, " ") ||
        productToRemove.name
          ?.split(/\s+/)
          .filter((w: string) => w.length >= 4)
          .slice(0, 3)
          .join(" ") ||
        "achadinhos utilidades";
    }

    // Raízes do título do produto sendo removido para evitar trocar por outro idêntico
    const removeWords = (productToRemove.name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length >= 4 && !["para", "com", "sem", "novo", "mini"].includes(w));

    // 2. PRIORIDADE 1: Busca AO VIVO na Shopee Open API (Mecanismo Live Search)
    // Traz produtos reais mais vendidos sem limite de estoque
    try {
      const liveRes = await searchProductOffers({
        keyword: searchKeyword,
        sortType: 2, // mais vendidos
        limit: 45,
      });

      if (liveRes.nodes && liveRes.nodes.length > 0) {
        const liveMatch = liveRes.nodes.find((node) => {
          const idStr = String(node.itemId);
          if (excludedIds.includes(idStr) || excludedSlugs.includes(idStr)) return false;

          const nodeWords = node.productName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/);

          // Se tiver candidatos suficientes, evita trocar produto por outro com o mesmo conceito
          const sharedRoots = removeWords.filter((w: string) => nodeWords.includes(w));
          if (sharedRoots.length >= 2 && liveRes.nodes.length > 5) return false;

          return true;
        });

        if (liveMatch) {
          const priceNum = parseFloat(liveMatch.price) || 0;
          const origPrice = liveMatch.priceMax ? parseFloat(liveMatch.priceMax) : null;
          candidate = {
            id: String(liveMatch.itemId),
            itemId: String(liveMatch.itemId),
            slug: String(liveMatch.itemId),
            categoryId: targetCategoryId || "shopee-live",
            category: { name: targetCategoryName },
            name: liveMatch.productName,
            price: priceNum,
            ratingStar: parseFloat(liveMatch.ratingStar) || 4.8,
            sales: liveMatch.sales || 0,
            discountRate: liveMatch.priceDiscountRate || null,
            imageUrl: liveMatch.imageUrl,
            affiliateLink: liveMatch.offerLink || liveMatch.productLink,
          } as any;
        }
      }
    } catch (liveErr: any) {
      console.warn("Aviso: Live Shopee Search em replace-product falhou, usando banco local:", liveErr.message);
    }

    // 3. PRIORIDADE 2: Se a Live Search da Shopee não retornou, busca no banco local
    if (!candidate) {
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
        if (orig?.categoryId) targetCategoryId = orig.categoryId;
      }

      if (targetCategoryId && targetCategoryId !== "shopee-live") {
        candidate = await prisma.product.findFirst({
          where: {
            categoryId: targetCategoryId,
            id: { notIn: excludedIds },
            slug: { notIn: excludedSlugs },
            price: { gt: 0 },
            imageUrl: { not: "" },
          },
          include: { category: true },
          orderBy: [{ sales: "desc" }, { ratingStar: "desc" }],
        });
      }
    }

    // 4. Se ainda não achou, busca no banco por categoria similar
    if (!candidate && productToRemove.categoryName) {
      const cat = await prisma.category.findFirst({
        where: { name: { contains: productToRemove.categoryName } },
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
          orderBy: [{ sales: "desc" }, { ratingStar: "desc" }],
        });
      }
    }

    // 5. Se ainda não achou, top vendas geral que não esteja na lista negra
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
