import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchShopeeFlashSaleSessions,
  fetchShopeeFlashSaleItems,
  generateShortLink,
  slugify,
} from "@/lib/shopee";

/**
 * ⚡ Sincronizador de Ofertas Relâmpago Oficiais da Shopee
 * 1. Puxa os produtos REAIS da página de Ofertas Relâmpago (https://shopee.com.br/flash_sale)
 * 2. Suporta colar URL direta com promotionId ou detecta automaticamente a sessão do momento
 * 3. Atualiza preços reais, porcentagens de desconto (-50% a -90%) e fotos oficiais da CDN
 * 4. Cadastra ou atualiza no catálogo e opcionalmente adiciona direto na Esteira de Vídeos Dark
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let promotionId: string | null = body?.promotionId || null;
    const url: string | null = body?.url || null;
    const limit: number = Math.min(60, Math.max(10, body?.limit || 30));
    const addToDarkQueue: boolean = body?.addToDarkQueue !== false;

    // 1. Se passou URL, extrai o promotionId
    if (url) {
      const match = url.match(/promotionId=(\d+)/i);
      if (match) promotionId = match[1];
    }

    // 2. Se não tem promotionId, descobre a sessão ativa no momento da Shopee
    let sessionInfo = null;
    if (!promotionId) {
      sessionInfo = await fetchShopeeFlashSaleSessions();
      promotionId = sessionInfo.currentPromotionId;
    }

    if (!promotionId) {
      return NextResponse.json(
        { error: "Nenhuma sessão de Ofertas Relâmpago ativa encontrada no momento na Shopee." },
        { status: 400 }
      );
    }

    // 3. Puxa os itens oficiais da página da Shopee
    console.log(`[FlashSale] Puxando ofertas da promoção ${promotionId}...`);
    const flashItems = await fetchShopeeFlashSaleItems(promotionId, limit);

    if (!flashItems.length) {
      return NextResponse.json(
        { error: `Nenhum produto encontrado para a sessão de Ofertas Relâmpago ${promotionId}.` },
        { status: 404 }
      );
    }

    // 4. Categoria padrão para novas ofertas
    let defaultCat = await prisma.category.findFirst({
      where: { slug: "casa-cozinha" },
    });
    if (!defaultCat) defaultCat = await prisma.category.findFirst();
    if (!defaultCat) {
      defaultCat = await prisma.category.create({
        data: {
          name: "Ofertas Relâmpago",
          slug: "ofertas-relampago",
        },
      });
    }

    let updatedCount = 0;
    let newDealsCount = 0;
    let darkQueueCount = 0;
    const processedProducts = [];

    // 5. Salva ou atualiza cada produto no banco
    for (const item of flashItems) {
      try {
        let affiliateLink = item.productUrl;
        try {
          // Tenta encurtar via API oficial de afiliados da Shopee
          const short = await generateShortLink(item.productUrl);
          if (short) affiliateLink = short;
        } catch {
          // Mantém URL original do produto caso as credenciais não estejam configuradas
        }

        const existing = await prisma.product.findFirst({
          where: { itemId: item.itemId },
        });

        let savedProduct;
        if (existing) {
          savedProduct = await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: item.name || existing.name,
              price: item.price,
              discountRate: item.discountRate,
              sales: item.sales,
              imageUrl: item.imageUrl || existing.imageUrl,
              affiliateLink: affiliateLink || existing.affiliateLink,
              priceUpdatedAt: new Date(),
            },
          });
          updatedCount++;
        } else {
          const uniqueSlug = `${slugify(item.name)}-${item.itemId.slice(-6)}`;
          savedProduct = await prisma.product.create({
            data: {
              name: item.name,
              slug: uniqueSlug,
              description: `⚡ Oferta Relâmpago do Dia: ${item.name} com ${item.discountRate}% OFF na Shopee! Garanta enquanto durarem os estoques no Achadinhos do Dia.`,
              price: item.price,
              affiliateLink,
              imageUrl: item.imageUrl,
              itemId: item.itemId,
              shopId: item.shopId,
              sales: item.sales,
              ratingStar: 4.9,
              discountRate: item.discountRate,
              categoryId: defaultCat.id,
              priceUpdatedAt: new Date(),
            },
          });
          newDealsCount++;
        }

        processedProducts.push(savedProduct);

        // 6. Adiciona automaticamente à Esteira de Vídeos Dark se solicitado
        if (addToDarkQueue) {
          const existingDark = await prisma.darkVideo.findFirst({
            where: {
              productId: savedProduct.id,
              status: { in: ["novo", "renderizando", "em_revisao"] },
            },
          });

          if (!existingDark) {
            await prisma.darkVideo.create({
              data: {
                productId: savedProduct.id,
                productName: savedProduct.name,
                categoryName: "Ofertas Relâmpago",
                price: savedProduct.price,
                affiliateLink: savedProduct.affiliateLink,
                imageUrl: savedProduct.imageUrl,
                status: "novo",
              },
            });
            darkQueueCount++;
          }
        }
      } catch (err: any) {
        console.warn(`[FlashSale] Erro ao salvar produto ${item.itemId}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `⚡ ${flashItems.length} Ofertas Relâmpago oficiais da Shopee sincronizadas com sucesso! (${newDealsCount} novos produtos, ${updatedCount} atualizados e ${darkQueueCount} enviados para a Esteira de Vídeos Dark)`,
      promotionId,
      totalFetched: flashItems.length,
      newDealsCount,
      updatedCount,
      darkQueueCount,
      sampleItems: processedProducts.slice(0, 5).map((p) => ({
        name: p.name,
        price: p.price,
        discountRate: p.discountRate,
      })),
    });
  } catch (error: any) {
    console.error("Erro na sincronização de ofertas relâmpago oficiais:", error);
    return NextResponse.json(
      { error: "Falha ao sincronizar ofertas relâmpago", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const promotionId = searchParams.get("promotionId");
  return POST(new NextRequest(req.url, {
    method: "POST",
    body: JSON.stringify({ url, promotionId }),
  }));
}
