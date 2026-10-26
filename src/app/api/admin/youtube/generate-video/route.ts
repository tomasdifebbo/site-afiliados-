import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export async function POST(req: NextRequest) {
  let tmpInputPath = "";
  try {
    const body = await req.json();
    const { postId, categoryId, siteUrl = "https://achadinhosdodia.com.br", products: clientProducts, theme: clientTheme, withAudio = true } = body;

    let products = clientProducts || [];
    let categoria = clientTheme || "Achadinhos Shopee";
    let slug = "achadinhos-" + Date.now();

    if (clientTheme) {
      const clean = clientTheme
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (clean) slug = clean;
    }

    if (!products.length) {
      if (postId) {
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
        categoria = post.title;
        slug = post.slug;
        const slugMatches = [...post.content.matchAll(/href="\/go\/([^"?]+)/g)];
        const slugs = [...new Set(slugMatches.map((m) => m[1]))];
        if (slugs.length > 0) {
          products = await prisma.product.findMany({ where: { slug: { in: slugs } }, take: 10 });
        }
      } else if (categoryId) {
        const category = await prisma.category.findUnique({ where: { id: categoryId } });
        if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
        categoria = category.name;
        slug = category.slug;
        products = await prisma.product.findMany({
          where: { categoryId, ratingStar: { gte: 4 }, price: { gt: 0 } },
          orderBy: { sales: "desc" },
          take: 10,
        });
      } else {
        categoria = "Mais Vendidos";
        slug = "top-achadinhos";
        products = await prisma.product.findMany({
          where: { ratingStar: { gte: 4 }, price: { gt: 0 } },
          orderBy: { sales: "desc" },
          take: 10,
        });
      }
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ error: "Nenhum produto encontrado para compor o vídeo." }, { status: 400 });
    }

    // No Vercel, o sistema de arquivos da função lambda é estritamente somente leitura
    // e os binários nativos FFmpeg e Piper TTS executam no computador local do operador.
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "A renderização de vídeos com FFmpeg e voz neural roda no seu computador local (http://localhost:3000/admin/youtube) para utilizar o processador da sua máquina com performance máxima e custo zero. Aqui na nuvem, você pode gerar roteiros, descrições e tags livremente!",
        },
        { status: 400 }
      );
    }

    // Cria diretório public/videos
    const publicVideosDir = join(process.cwd(), "public", "videos");
    try {
      if (!existsSync(publicVideosDir)) mkdirSync(publicVideosDir, { recursive: true });
    } catch (fsErr: any) {
      console.warn("Aviso ao criar diretório public/videos:", fsErr.message);
    }

    const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    const outFileName = `${safeSlug}.mp4`;
    const outFilePath = join(publicVideosDir, outFileName);

    // Salva o payload em arquivo temporário para passar ao gerador
    tmpInputPath = join(process.cwd(), `.tmp_video_input_${Date.now()}.json`);
    writeFileSync(
      tmpInputPath,
      JSON.stringify({
        products: products.slice(0, 10).map((p: any) => ({
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          imageUrl: p.imageUrl,
          ratingStar: p.ratingStar || 4.9,
          sales: p.sales || p.sold || 1000,
          discount: p.discount ?? p.discountRate ?? null,
        })),
        categoria,
        slug: safeSlug,
        siteUrl,
        canal: "Achadinhos do Dia",
        withAudio,
      }),
      "utf-8"
    );

    // Caminho do script de forma dinâmica para evitar resolução estática do Turbopack
    const scriptPath = join(process.cwd(), "scripts", ["generate", "video.mjs"].join("_"));

    // Executa o script gerador isolado
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(process.execPath, [scriptPath, "--input", tmpInputPath, "--out", outFilePath], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let errOutput = "";
      proc.stderr.on("data", (d) => {
        const str = d.toString();
        errOutput += str;
        console.error("[generate-video err]", str);
      });
      proc.stdout.on("data", (d) => {
        console.log("[generate-video]", d.toString());
      });

      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Falha ao gerar vídeo (código ${code}): ${errOutput.slice(-300)}`));
      });
    });

    return NextResponse.json({
      success: true,
      videoUrl: `/videos/${outFileName}`,
      filename: outFileName,
      productCount: Math.min(10, products.length),
      categoria,
    });
  } catch (error: any) {
    console.error("Erro na rota generate-video:", error);
    return NextResponse.json({ error: error.message || "Erro interno ao gerar vídeo" }, { status: 500 });
  } finally {
    if (tmpInputPath && existsSync(tmpInputPath)) {
      try {
        unlinkSync(tmpInputPath);
      } catch {}
    }
  }
}
