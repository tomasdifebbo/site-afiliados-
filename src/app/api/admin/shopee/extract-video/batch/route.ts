import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractShopeeProductVideo } from "@/lib/shopeeVideoExtractor";

/**
 * POST /api/admin/shopee/extract-video/batch
 * Extrai vídeos dos vendedores da Shopee em lote para todos os itens
 * da Esteira de Vídeos Dark que ainda não possuem sellerVideoUrl.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(20, Math.max(1, body?.limit || 10));

    // Busca itens da DarkVideo que não têm sellerVideoUrl e possuem productId
    const items = await prisma.darkVideo.findMany({
      where: {
        sellerVideoUrl: null,
        productId: { not: null },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    if (!items.length) {
      return NextResponse.json({
        success: true,
        message: "Todos os itens da esteira já possuem vídeo do vendedor ou não têm produto vinculado.",
        extracted: 0,
        failed: 0,
      });
    }

    let extracted = 0;
    let failed = 0;
    const results: { name: string; success: boolean; videoUrl?: string }[] = [];

    for (const item of items) {
      try {
        // Busca dados do produto no banco para montar a URL
        const product = await prisma.product.findUnique({
          where: { id: item.productId! },
        });

        if (!product || !product.shopId || !product.itemId) {
          failed++;
          results.push({ name: item.productName, success: false });
          continue;
        }

        // Verifica se o produto já tem vídeo salvo
        if (product.videoUrl) {
          await prisma.darkVideo.update({
            where: { id: item.id },
            data: { sellerVideoUrl: product.videoUrl },
          });
          extracted++;
          results.push({ name: item.productName, success: true, videoUrl: product.videoUrl });
          continue;
        }

        const targetUrl = `https://shopee.com.br/product/${product.shopId}/${product.itemId}`;
        console.log(`[BatchVideo] Extraindo vídeo para: ${item.productName}...`);

        const extraction = await extractShopeeProductVideo(targetUrl, { timeoutMs: 30000 });

        if (extraction.success && extraction.videoUrl) {
          // Salva no DarkVideo
          await prisma.darkVideo.update({
            where: { id: item.id },
            data: { sellerVideoUrl: extraction.videoUrl },
          });

          // Salva no Product também
          await prisma.product.update({
            where: { id: product.id },
            data: { videoUrl: extraction.videoUrl },
          }).catch(() => null);

          extracted++;
          results.push({ name: item.productName, success: true, videoUrl: extraction.videoUrl });
          console.log(`[BatchVideo] ✅ ${item.productName}`);
        } else {
          failed++;
          results.push({ name: item.productName, success: false });
          console.log(`[BatchVideo] ❌ ${item.productName}: ${extraction.error}`);
        }
      } catch (err: any) {
        failed++;
        results.push({ name: item.productName, success: false });
        console.warn(`[BatchVideo] Erro em ${item.productName}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `🎬 Lote finalizado! ${extracted} vídeos extraídos com sucesso, ${failed} sem vídeo do vendedor.`,
      extracted,
      failed,
      total: items.length,
      results,
    });
  } catch (error: any) {
    console.error("Erro na extração em lote de vídeos:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno na extração em lote" },
      { status: 500 }
    );
  }
}
