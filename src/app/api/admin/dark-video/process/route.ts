import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { spawn, execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { generateProductScriptWithGemini } from "@/lib/geminiScriptGenerator";

// ── Funções de Roteiro e Legenda Humanizados ──────────────────────────────────
function generateDarkScript(product: { name: string; price?: number | null; categoryName?: string | null }) {
  const name = product.name.trim();
  const cat = product.categoryName || "achadinhos";
  const priceFormatted = product.price
    ? `R$ ${product.price.toFixed(2).replace(".", ",")}`
    : "o preço promocional da semana";

  // Encurta nome para fala natural
  const shortName = name.replace(/^(kit \d+x?|par de|jogo de|mini|super)\s+/i, "").split(/[-,|]/)[0].trim().slice(0, 45);

  const hooks = [
    `Sabe quando você quer praticidade e economia sem complicação? Dá uma olhada nesse achadinho de ${cat}:`,
    `Se você gosta de encontrar coisas úteis que facilitam a rotina em casa, veja só o que encontramos:`,
    `Para quem procura um bom custo-benefício com utilidade de verdade no dia a dia, essa descoberta é ideal:`,
    `Quer deixar o seu espaço mais organizado e moderno sem gastar muito? Veja essa opção:`,
  ];
  const hook = hooks[Math.floor(Math.random() * hooks.length)];

  const script = `${hook} é o ${shortName}. Ele se destaca pela versatilidade e acabamento, perfeito para quem quer conforto e funcionalidade. No anúncio oficial da Shopee, o preço confirmado é de ${priceFormatted}. Dá uma conferida nas fotos e avaliações completas no link oficial. Este conteúdo contém indicação de afiliado. O link com a oferta está no primeiro comentário e na bio!`;

  const caption = `✨ Achadinho Shopee: ${shortName}!
🔥 Preço verificado: ${priceFormatted}
⭐ Excelente avaliação de compradores reais!

👉 Link oficial com desconto no primeiro comentário fixado e na bio!

⚠️ Conteúdo com indicação de afiliado. Preços e estoque podem variar.

#achadinhos #shopee #achadinhosshopee #comprinhas #dicasparacasa #utilidades #review`;

  return { script, caption, shortName };
}

// ── Localizador do FFprobe ──────────────────────────────────────────────────
function findFFprobe(): string {
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    process.env.FFPROBE_PATH,
    (ffprobeInstaller as any)?.path,
    "ffprobe",
    localAppData ? join(localAppData, "Microsoft/WinGet/Links/ffprobe.exe") : null,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try {
      execSync(`"${c}" -version`, { stdio: "ignore" });
      return c;
    } catch {}
  }
  return "ffprobe";
}

// ── Auditoria Técnica Automática via FFprobe ─────────────────────────────────
function runQualityAudit(videoFilePath: string) {
  try {
    const ffprobeBin = findFFprobe();
    const probeCmd = `"${ffprobeBin}" -v error -show_entries format=duration,size:stream=codec_type,codec_name,width,height -of json "${videoFilePath}"`;
    const out = execSync(probeCmd, { encoding: "utf-8" });
    const data = JSON.parse(out);

    const duration = parseFloat(data.format?.duration || "0");
    const sizeBytes = parseInt(data.format?.size || "0", 10);
    const streams = data.streams || [];

    const videoStream = streams.find((s: any) => s.codec_type === "video");
    const audioStream = streams.find((s: any) => s.codec_type === "audio");

    const passed = Boolean(
      duration >= 10 &&
      duration <= 60 &&
      sizeBytes > 100000 &&
      videoStream &&
      audioStream
    );

    return {
      passed,
      duration: Math.round(duration * 10) / 10,
      sizeMb: Math.round((sizeBytes / (1024 * 1024)) * 10) / 10,
      videoCodec: videoStream?.codec_name || "desconhecido",
      audioCodec: audioStream?.codec_name || "desconhecido",
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : "desconhecida",
      checks: {
        durationValid: duration >= 10 && duration <= 60,
        hasVideo: Boolean(videoStream),
        hasAudio: Boolean(audioStream),
        fileIntegrity: sizeBytes > 100000,
      },
      auditTime: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      passed: false,
      error: err.message,
      auditTime: new Date().toISOString(),
    };
  }
}

export async function POST(req: NextRequest) {
  let tmpJsonPath = "";
  try {
    const body = await req.json().catch(() => ({}));
    const requestedId = body.id;

    // 1. Busca item especificado ou o mais antigo na fila com status 'novo'
    let item = null;
    if (requestedId) {
      item = await prisma.darkVideo.findUnique({ where: { id: requestedId } });
    } else {
      item = await prisma.darkVideo.findFirst({
        where: { status: "novo" },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!item) {
      return NextResponse.json({ message: "Nenhum produto aguardando na fila." }, { status: 404 });
    }

    // 2. Trava o status como 'renderizando'
    await prisma.darkVideo.update({
      where: { id: item.id },
      data: { status: "renderizando" },
    });

    // 3. Gera Roteiro e Legenda com Gemini AI (com fallback automático)
    let script = item.scriptText;
    let caption = item.captionText;
    let shortName = item.productName
      .replace(/^(kit \d+x?|par de|jogo de|mini|super)\s+/i, "")
      .split(/[-,|]/)[0]
      .trim()
      .slice(0, 45);

    if (!script || !caption) {
      const generated = await generateProductScriptWithGemini({
        name: item.productName,
        price: item.price,
        categoryName: item.categoryName,
        apiKey: body.apiKey,
      });
      script = generated.script;
      caption = generated.caption;
      shortName = generated.shortName;
    }

    // No Vercel, o sistema de arquivos lambda é somente leitura e não possui FFmpeg/Piper instalados.
    // Salvamos o roteiro e legenda humanizada e notificamos o usuário.
    if (process.env.VERCEL) {
      await prisma.darkVideo.update({
        where: { id: item.id },
        data: {
          status: "novo",
          scriptText: script,
          captionText: caption,
        },
      });
      return NextResponse.json(
        {
          error:
            "A renderização do arquivo MP4 com FFmpeg e voz neural roda no seu computador local em http://localhost:3000/admin/youtube. O roteiro exclusivo e legendas com Gemini AI já foram gerados com sucesso!",
        },
        { status: 400 }
      );
    }

    // 4. Prepara diretório de saída
    const publicVideosDarkDir = join(process.cwd(), "public", "videos", "dark");
    try {
      if (!existsSync(publicVideosDarkDir)) mkdirSync(publicVideosDarkDir, { recursive: true });
    } catch (fsErr: any) {
      console.warn("Aviso ao criar diretório public/videos/dark:", fsErr.message);
    }

    const safeSlug = shortName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "dark-video";

    const outFileName = `dark-${safeSlug}-${item.id.slice(-6)}.mp4`;
    const outFilePath = join(publicVideosDarkDir, outFileName);

    // 5. Prepara payload para o gerador de Shorts 9:16
    tmpJsonPath = join(process.cwd(), `.tmp_dark_${item.id}.json`);
    writeFileSync(
      tmpJsonPath,
      JSON.stringify({
        product: {
          name: item.productName,
          price: item.price || 0,
          imageUrl: item.imageUrl || "",
          sellerVideoUrl: item.sellerVideoUrl || undefined,
          scriptText: script,
          ratingStar: 4.9,
          sales: 1200,
          discountRate: item.price ? 25 : undefined,
        },
        canal: "Achadinhos do Dia",
        siteUrl: "https://achadinhosdodia.com.br",
        withAudio: true,
      }),
      "utf-8"
    );

    // 6. Executa geração do Shorts com FFmpeg e voz neural
    const scriptPath = join(process.cwd(), "scripts", "generate_shorts.mjs");
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(process.execPath, [scriptPath, "--input", tmpJsonPath, "--out", outFilePath], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let errOutput = "";
      proc.stdout.on("data", (d) => {
        console.log("[dark-video]", d.toString().trim());
      });
      proc.stderr.on("data", (d) => { errOutput += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0 && existsSync(outFilePath)) resolve();
        else reject(new Error(`Falha no gerador de vídeo (${code}): ${errOutput.slice(-300)}`));
      });
    });

    // 7. Auditoria Técnica Automática
    const audit = runQualityAudit(outFilePath);

    // 8. Atualiza o banco com o vídeo pronto e coloca em 'em_revisao'
    const updated = await prisma.darkVideo.update({
      where: { id: item.id },
      data: {
        status: audit.passed ? "em_revisao" : "rejeitado",
        videoUrl: `/videos/dark/${outFileName}`,
        durationSeconds: audit.duration || null,
        scriptText: script,
        captionText: caption,
        qualityAudit: JSON.stringify(audit),
        notes: audit.passed ? "Auditoria técnica OK: vídeo, áudio e duração válidos." : `Falha técnica: ${audit.error || "problema na renderização"}`,
      },
    });

    return NextResponse.json({
      success: true,
      item: updated,
      audit,
    });
  } catch (error: any) {
    console.error("Erro no processador de vídeos dark:", error);
    return NextResponse.json({ error: error.message || "Erro no processamento" }, { status: 500 });
  } finally {
    if (tmpJsonPath && existsSync(tmpJsonPath)) {
      try { unlinkSync(tmpJsonPath); } catch {}
    }
  }
}
