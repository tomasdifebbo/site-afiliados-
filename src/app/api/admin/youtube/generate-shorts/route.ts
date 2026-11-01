import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export async function POST(req: NextRequest) {
  let tmpInputPath = "";
  try {
    const body = await req.json();
    const {
      product: clientProduct,
      productId,
      siteUrl = "https://achadinhosdodia.com.br",
      withAudio = true,
    } = body;

    let product = clientProduct;

    if (!product && productId) {
      product = await prisma.product.findUnique({ where: { id: productId } });
    }

    if (!product) {
      // Se nenhum produto for passado, pega o mais vendido do site
      product = await prisma.product.findFirst({
        where: { ratingStar: { gte: 4 }, price: { gt: 0 } },
        orderBy: { sales: "desc" },
      });
    }

    if (!product) {
      return NextResponse.json({ error: "Nenhum produto encontrado para compor o Shorts." }, { status: 400 });
    }

    // No Vercel, o sistema de arquivos da função lambda é estritamente somente leitura
    // e os binários nativos FFmpeg e Piper TTS executam no computador local do operador.
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "A renderização de Shorts verticais com FFmpeg e voz neural roda no seu computador local (http://localhost:3000/admin/youtube) para utilizar o processador da sua máquina com performance máxima e custo zero. Aqui na nuvem, você pode gerar roteiros, descrições e tags livremente!",
        },
        { status: 400 }
      );
    }

    const publicVideosDir = join(process.cwd(), "public", "videos");
    try {
      if (!existsSync(publicVideosDir)) mkdirSync(publicVideosDir, { recursive: true });
    } catch (fsErr: any) {
      console.warn("Aviso ao criar diretório public/videos:", fsErr.message);
    }

    const rawSlug = product.slug || product.name || "shorts-achadinho";
    const safeSlug = "shorts-" + rawSlug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 45);

    const outFileName = `${safeSlug}-${Date.now()}.mp4`;
    const outFilePath = join(publicVideosDir, outFileName);

    // Salva payload em arquivo temporário
    tmpInputPath = join(process.cwd(), `.tmp_shorts_input_${Date.now()}.json`);
    writeFileSync(
      tmpInputPath,
      JSON.stringify({
        product: {
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          imageUrl: product.imageUrl,
          sellerVideoUrl: product.sellerVideoUrl || product.videoUrl || null,
          ratingStar: product.ratingStar || 4.9,
          sales: product.sales || 1500,
          discount: product.discount ?? product.discountRate ?? null,
        },
        siteUrl,
        canal: "Achadinhos do Dia",
        withAudio,
      }),
      "utf-8"
    );

    const scriptPath = join(process.cwd(), "scripts", ["generate", "shorts.mjs"].join("_"));

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(process.execPath, [scriptPath, "--input", tmpInputPath, "--out", outFilePath], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let errOutput = "";
      proc.stderr.on("data", (d) => {
        const str = d.toString();
        errOutput += str;
        console.error("[generate-shorts err]", str);
      });
      proc.stdout.on("data", (d) => {
        console.log("[generate-shorts]", d.toString());
      });

      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Falha ao gerar Shorts (código ${code}): ${errOutput.slice(-300)}`));
      });
    });

    return NextResponse.json({
      success: true,
      videoUrl: `/videos/${outFileName}`,
      filename: outFileName,
      product: {
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
      },
    });
  } catch (error: any) {
    console.error("Erro na rota generate-shorts:", error);
    return NextResponse.json({ error: error.message || "Erro interno ao gerar Shorts" }, { status: 500 });
  } finally {
    if (tmpInputPath && existsSync(tmpInputPath)) {
      try {
        unlinkSync(tmpInputPath);
      } catch {}
    }
  }
}
