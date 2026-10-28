import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { generateProductScriptWithGemini } from "@/lib/geminiScriptGenerator";

/**
 * 🎬 ESTÚDIO DE CRIAÇÃO DIRETA DE VÍDEOS (YouTube Shorts, TikTok, Kwai)
 * Renderiza o vídeo vertical 9:16 em alta velocidade combinando:
 * 1. Produto Mais Vendido
 * 2. Vídeo Real do Vendedor (ou foto HD)
 * 3. Narrativa Humanizada do Gemini AI
 * 4. Voz Neural e Overlays de Preço e CTA
 */
export async function POST(req: NextRequest) {
  let tmpJsonPath = "";
  try {
    const body = await req.json();
    const {
      productName,
      price,
      imageUrl,
      sellerVideoUrl,
      scriptText,
      captionText,
      affiliateLink,
      categoryName,
      sales,
      discountRate,
    } = body;

    if (!productName) {
      return NextResponse.json({ error: "Nome do produto é obrigatório" }, { status: 400 });
    }

    // 1. Gera ou usa Roteiro e Legenda do Gemini
    let script = scriptText;
    let caption = captionText;
    let shortName = productName
      .replace(/^(kit \d+x?|par de|jogo de|mini|super)\s+/i, "")
      .split(/[-,|]/)[0]
      .trim()
      .slice(0, 45);

    if (!script || !caption) {
      const generated = await generateProductScriptWithGemini({
        name: productName,
        price: price ? Number(price) : null,
        categoryName: categoryName || "Achadinhos",
      });
      script = generated.script;
      caption = generated.caption;
      shortName = generated.shortName;
    }

    // 2. Cria registro no banco de dados
    const item = await prisma.darkVideo.create({
      data: {
        productName,
        categoryName: categoryName || "Mais Vendidos",
        price: price ? Number(price) : null,
        affiliateLink: affiliateLink || "",
        imageUrl: imageUrl || "",
        sellerVideoUrl: sellerVideoUrl || null,
        scriptText: script,
        captionText: caption,
        status: "renderizando",
      },
    });

    // 3. Prepara diretório de saída
    const publicVideosDarkDir = join(process.cwd(), "public", "videos", "dark");
    if (!existsSync(publicVideosDarkDir)) {
      mkdirSync(publicVideosDarkDir, { recursive: true });
    }

    const safeSlug =
      shortName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "video";

    const outFileName = `studio-${safeSlug}-${item.id.slice(-6)}.mp4`;
    const outFilePath = join(publicVideosDarkDir, outFileName);

    // 4. Prepara payload para o gerador de Shorts 9:16
    tmpJsonPath = join(process.cwd(), `.tmp_studio_${item.id}.json`);
    writeFileSync(
      tmpJsonPath,
      JSON.stringify({
        product: {
          name: productName,
          price: price || 0,
          imageUrl: imageUrl || "",
          sellerVideoUrl: sellerVideoUrl || undefined,
          scriptText: script,
          ratingStar: 4.9,
          sales: sales || 2400,
          discountRate: discountRate || (price ? 30 : undefined),
        },
        canal: "Achadinhos do Dia",
        siteUrl: "https://achadinhosdodia.com.br",
        withAudio: true,
      }),
      "utf-8"
    );

    // 5. Executa geração do Shorts com FFmpeg e voz neural
    const scriptPath = join(process.cwd(), "scripts", "generate_shorts.mjs");
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(process.execPath, [scriptPath, "--input", tmpJsonPath, "--out", outFilePath], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let errOutput = "";
      proc.stderr.on("data", (data) => {
        errOutput += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0 && existsSync(outFilePath)) {
          resolve();
        } else {
          reject(new Error(`Falha ao compilar vídeo (código ${code}): ${errOutput}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Erro ao iniciar gerador de vídeo: ${err.message}`));
      });
    });

    // 6. Atualiza o status para aprovado com o link do vídeo final
    const finalVideoUrl = `/videos/dark/${outFileName}`;
    const updated = await prisma.darkVideo.update({
      where: { id: item.id },
      data: {
        status: "aprovado",
        videoUrl: finalVideoUrl,
        durationSeconds: 15.0,
      },
    });

    return NextResponse.json({
      success: true,
      videoUrl: finalVideoUrl,
      item: updated,
      scriptText: script,
      captionText: caption,
    });
  } catch (error: any) {
    console.error("Erro no Studio de Vídeos:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao renderizar vídeo" },
      { status: 500 }
    );
  } finally {
    if (tmpJsonPath && existsSync(tmpJsonPath)) {
      try {
        unlinkSync(tmpJsonPath);
      } catch {}
    }
  }
}
