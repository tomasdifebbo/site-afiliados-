import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractShopeeProductVideo } from "@/lib/shopeeVideoExtractor";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, darkVideoId, productId } = body;

    let targetUrl = url;
    let darkVideoItem: any = null;
    let productItem: any = null;

    if (darkVideoId) {
      darkVideoItem = await prisma.darkVideo.findUnique({
        where: { id: darkVideoId },
      });
      if (!darkVideoItem) {
        return NextResponse.json({ error: "Item de vídeo dark não encontrado" }, { status: 404 });
      }
      if (!targetUrl) {
        targetUrl = darkVideoItem.affiliateLink;
      }
      if (!targetUrl && darkVideoItem.productId) {
        productItem = await prisma.product.findUnique({
          where: { id: darkVideoItem.productId },
        });
        if (productItem) {
          if (productItem.shopId && productItem.itemId) {
            targetUrl = `https://shopee.com.br/product/${productItem.shopId}/${productItem.itemId}`;
          } else {
            targetUrl = productItem.affiliateLink;
          }
        }
      }
    } else if (productId) {
      productItem = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!productItem) {
        return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
      }
      if (!targetUrl) {
        if (productItem.shopId && productItem.itemId) {
          targetUrl = `https://shopee.com.br/product/${productItem.shopId}/${productItem.itemId}`;
        } else {
          targetUrl = productItem.affiliateLink;
        }
      }
    }

    if (!targetUrl) {
      return NextResponse.json(
        { error: "URL ou identificador do produto da Shopee é obrigatório" },
        { status: 400 }
      );
    }

    // Se a URL já for um link direto de vídeo da Shopee (da galeria, VOD ou comentário)
    const isDirectVideo =
      targetUrl.includes("vod.susercontent.com") ||
      targetUrl.includes("cv.shopee") ||
      targetUrl.includes("mms.vod") ||
      /\.(mp4|webm|mov)(\?.*)?$/i.test(targetUrl);

    if (isDirectVideo) {
      if (darkVideoId) {
        darkVideoItem = await prisma.darkVideo.update({
          where: { id: darkVideoId },
          data: { sellerVideoUrl: targetUrl },
        });
      }
      const targetProdId = productId || darkVideoItem?.productId;
      if (targetProdId) {
        await prisma.product.update({
          where: { id: targetProdId },
          data: { videoUrl: targetUrl },
        }).catch(() => null);
      }
      return NextResponse.json({
        success: true,
        videoUrl: targetUrl,
        allVideos: [
          {
            url: targetUrl,
            title: "Vídeo Direto da Shopee (Galeria / Comentário)",
            type: targetUrl.includes("review") ? "review" : "gallery",
          },
        ],
        source: "direct_vod",
      });
    }

    // Executa a extração stealth de vídeo
    const extraction = await extractShopeeProductVideo(targetUrl);

    if (!extraction.success || !extraction.videoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: extraction.error || "Não foi possível extrair o vídeo do vendedor.",
        },
        { status: 404 }
      );
    }

    // Salva no banco se tiver darkVideoId
    if (darkVideoId) {
      darkVideoItem = await prisma.darkVideo.update({
        where: { id: darkVideoId },
        data: {
          sellerVideoUrl: extraction.videoUrl,
        },
      });
    }

    // Salva no banco se tiver productId
    const targetProdId = productId || darkVideoItem?.productId;
    if (targetProdId) {
      await prisma.product.update({
        where: { id: targetProdId },
        data: {
          videoUrl: extraction.videoUrl,
        },
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      videoUrl: extraction.videoUrl,
      allVideos: extraction.allVideos || [{ url: extraction.videoUrl, title: "Vídeo Shopee", type: "gallery" }],
      duration: extraction.duration,
      title: extraction.title,
      shopId: extraction.shopId,
      itemId: extraction.itemId,
      item: darkVideoItem,
    });
  } catch (err: any) {
    console.error("Erro na rota de extração de vídeo Shopee:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno ao extrair vídeo" },
      { status: 500 }
    );
  }
}
