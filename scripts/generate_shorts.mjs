/**
 * 🎬 GERADOR DE VÍDEO VERTICAL SHORTS / REELS / TIKTOK (9:16 - 1080x1920)
 * Especializado em achadinhos virais da Shopee com a voz Antonio Neural (TechZone)
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import sharp from 'sharp';
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Caminhos e Configuração ────────────────────────────────────────────────────
const FFMPEG_PATHS = [
  process.env.FFMPEG_PATH,
  'ffmpeg',
  'C:/Users/TOMAS/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe',
].filter(Boolean);

const PIPER_PATHS = [
  process.env.PIPER_PATH,
  'C:/Users/TOMAS/AppData/Roaming/Python/Python314/Scripts/piper.exe',
  'piper',
].filter(Boolean);

const PIPER_MODEL_PATH = resolve(ROOT, 'models/piper/pt_BR-faber-medium.onnx');

export function findFFmpeg() {
  for (const p of FFMPEG_PATHS) {
    try {
      execSync(`"${p}" -version`, { stdio: 'ignore' });
      return p;
    } catch {}
  }
  throw new Error('FFmpeg não encontrado.');
}

export function findPiper() {
  for (const p of PIPER_PATHS) {
    try {
      execSync(`"${p}" --help`, { stdio: 'ignore' });
      if (existsSync(PIPER_MODEL_PATH)) {
        return { bin: p, model: PIPER_MODEL_PATH };
      }
    } catch {}
  }
  return null;
}

// ── Constantes do Shorts ───────────────────────────────────────────────────────
const W = 1080;
const H = 1920;
const FPS = 30;

const BG_COLOR      = '#0b0c10';
const ORANGE        = '#FF5722';
const ORANGE_GRAD   = '#FF7A00';
const WHITE         = '#FFFFFF';
const MUTED         = '#94A3B8';
const STAR_GOLD     = '#F59E0B';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fetchImageWithRetry(url, maxRetries = 3) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    throw new Error('URL de imagem inválida: ' + url);
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': 'https://shopee.com.br/',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const arr = await res.arrayBuffer();
      const rawBuf = Buffer.from(arr);

      const pngBuf = await sharp(rawBuf)
        .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();

      return await loadImage(pngBuf);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
}

function getWavDuration(filePath) {
  if (!existsSync(filePath)) return 0;
  const buf = readFileSync(filePath);
  if (buf.length < 44) return 0;
  const byteRate = buf.readUInt32LE(28);
  const dataSize = buf.length - 44;
  return byteRate > 0 ? dataSize / byteRate : 0;
}

function formatSpokenPrice(price) {
  if (!price) return 'preço promocional';
  const num = Number(price);
  const intPart = Math.floor(num);
  const centPart = Math.round((num - intPart) * 100);

  if (centPart > 0) {
    return `${intPart} reais e ${centPart} centavos`;
  }
  return `${intPart} reais`;
}

function sanitizeForTTS(text) {
  return (text || '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[#*_~`\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBenefit(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('tênis') || n.includes('tenis')) return 'Super macio e perfeito para usar no dia a dia sem cansar os pés.';
  if (n.includes('sandália') || n.includes('sandalia')) return 'Muito confortável, leve e combina com qualquer ocasião.';
  if (n.includes('chinelo') || n.includes('nuvem') || n.includes('babuche')) return 'Aquela sensação gostosa de pisar nas nuvens.';
  if (n.includes('cortina') || n.includes('divisória')) return 'Você instala em poucos segundos sem furar nenhuma parede.';
  if (n.includes('organiz')) return 'Deixa qualquer gaveta ou ambiente 100% arrumado sem esforço.';
  if (n.includes('cozinha') || n.includes('panela') || n.includes('triturador')) return 'Economiza um tempo enorme no preparo das refeições.';
  if (n.includes('solar') || n.includes('pele') || n.includes('facial')) return 'Ideal para deixar sua pele linda, protegida e radiante.';
  if (n.includes('cabelo') || n.includes('escova')) return 'Prático para modelar e deixar os fios impecáveis em minutos.';
  return 'Tem uma qualidade incrível que impressiona logo de cara.';
}

function getShortName(name) {
  return sanitizeForTTS((name || '').split(' ').slice(0, 5).join(' '));
}

// ── Síntese de Voz TechZone ────────────────────────────────────────────────────

async function synthesizeWithEdgeTTS(rawText, outWavPath, ffmpegBin, voice = 'pt-BR-AntonioNeural') {
  const clean = sanitizeForTTS(rawText);
  const tmpMp3 = outWavPath.replace(/\.wav$/, `_${Date.now()}.mp3`);

  await new Promise((resolve, reject) => {
    const proc = spawn('python', ['-m', 'edge_tts', '--voice', voice, '--text', clean, '--write-media', tmpMp3], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    let errOutput = '';
    proc.stderr.on('data', (d) => { errOutput += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && existsSync(tmpMp3)) resolve();
      else reject(new Error(`Edge TTS falhou: ${errOutput}`));
    });
  });

  execSync(`"${ffmpegBin}" -y -i "${tmpMp3}" -ar 22050 -ac 1 "${outWavPath}"`, { stdio: 'ignore' });
  try { rmSync(tmpMp3, { force: true }); } catch {}
}

async function synthesizeText(piperConfig, rawText, outWavPath) {
  const clean = sanitizeForTTS(rawText);
  return new Promise((resolve, reject) => {
    const proc = spawn(piperConfig.bin, ['-m', piperConfig.model, '-f', outWavPath], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    let errOutput = '';
    proc.stderr.on('data', (d) => { errOutput += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && existsSync(outWavPath)) resolve();
      else reject(new Error(`Piper erro: ${errOutput}`));
    });

    proc.stdin.write(clean, 'utf-8');
    proc.stdin.end();
  });
}

async function synthesizeVoiceUnified({ text, outWavPath, ffmpegBin, piperConfig }) {
  try {
    await synthesizeWithEdgeTTS(text, outWavPath, ffmpegBin, 'pt-BR-AntonioNeural');
    return 'edge-antonio';
  } catch (err) {
    if (piperConfig) {
      await synthesizeText(piperConfig, text, outWavPath);
      return 'piper-faber';
    }
    throw err;
  }
}

// ── Desenho do Shorts no Canvas (1080x1920) ────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  let linesCount = 0;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      linesCount++;
      if (linesCount >= maxLines) {
        ctx.fillText(line + '...', x, lineY);
        return lineY;
      }
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, lineY);
  }
  return lineY;
}

export function renderShortsFrame(product, progress = 0) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // 1. Fundo escuro com grid elegante
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // 2. Badge Superior Shopee
  const badgeY = 130;
  const badgeH = 68;
  const badgeW = 680;
  const badgeX = (W - badgeW) / 2;

  // Sombra suave do badge
  ctx.fillStyle = 'rgba(255, 87, 34, 0.25)';
  roundRect(ctx, badgeX - 4, badgeY - 2, badgeW + 8, badgeH + 4, 34);
  ctx.fill();

  // Fundo gradiente do badge
  ctx.fillStyle = ORANGE;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 34);
  ctx.fill();

  ctx.font = '900 28px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.fillText('ACHADINHO VIRAL DA SHOPEE', W / 2, badgeY + 44);
  ctx.textAlign = 'left';

  // 3. Card do Produto Central
  const cardX = 80;
  const cardY = 240;
  const cardW = 920;
  const cardH = 980;

  // Sombra do card
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(ctx, cardX + 8, cardY + 12, cardW, cardH, 32);
  ctx.fill();

  // Card branco
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  // Imagem do produto com leve zoom dinâmico (Ken Burns sutil)
  if (product._img) {
    ctx.save();
    roundRect(ctx, cardX + 16, cardY + 16, cardW - 32, cardH - 32, 24);
    ctx.clip();

    const zoom = 1.0 + progress * 0.05; // 5% de zoom gradual
    const baseScale = Math.min((cardW - 48) / product._img.width, (cardH - 48) / product._img.height);
    const finalScale = baseScale * zoom;

    const iw = product._img.width * finalScale;
    const ih = product._img.height * finalScale;
    const ix = cardX + (cardW - iw) / 2;
    const iy = cardY + (cardH - ih) / 2;

    ctx.drawImage(product._img, ix, iy, iw, ih);
    ctx.restore();
  }

  // Tag "Oferta Shopee" sobre a foto
  ctx.fillStyle = '#FF4713';
  roundRect(ctx, cardX + 36, cardY + 36, 190, 48, 12);
  ctx.fill();
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.fillText('Oferta Shopee', cardX + 54, cardY + 68);

  // 4. Informações do Produto (Abaixo do Card)
  const infoX = 80;
  let curY = 1270;

  // Avaliação e Vendas
  const rating = product.ratingStar ? product.ratingStar.toFixed(1) : '4.9';
  const sales = product.sales || 1500;
  const salesStr = sales >= 1000 ? `${Math.floor(sales / 1000)} mil` : `${sales}`;

  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = STAR_GOLD;
  ctx.fillText(`★ ${rating}`, infoX, curY);

  ctx.fillStyle = MUTED;
  ctx.fillText(` ·  mais de ${salesStr} vendas na Shopee`, infoX + 90, curY);
  curY += 60;

  // Título do Produto (2 linhas bold)
  ctx.font = '800 46px sans-serif';
  ctx.fillStyle = WHITE;
  curY = wrapText(ctx, product.name || 'Achadinho Incrível', infoX, curY, 920, 56, 2) + 25;

  // Preço e Desconto
  const priceNum = Number(product.price || 0);
  const priceStr = `R$ ${priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  ctx.font = '900 80px sans-serif';
  ctx.fillStyle = ORANGE;
  ctx.fillText(priceStr, infoX, curY + 65);

  const priceWidth = ctx.measureText(priceStr).width;

  // Badge de desconto
  const discountPct = product.discount || product.discountRate;
  if (discountPct) {
    const badgeOffX = infoX + priceWidth + 24;
    const badgeOffY = curY + 65 - 54;
    ctx.fillStyle = '#DC2626';
    roundRect(ctx, badgeOffX, badgeOffY, 150, 48, 12);
    ctx.fill();

    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'center';
    ctx.fillText(`-${discountPct}%`, badgeOffX + 75, badgeOffY + 34);
    ctx.textAlign = 'left';
  }

  // 5. Botão Pulsante de Chamada à Ação (CTA)
  const ctaY = 1680;
  const ctaW = 920;
  const ctaH = 96;

  // Glow do botão
  ctx.fillStyle = 'rgba(255, 87, 34, 0.35)';
  roundRect(ctx, infoX - 4, ctaY - 4, ctaW + 8, ctaH + 8, 48);
  ctx.fill();

  // Fundo do botão
  ctx.fillStyle = WHITE;
  roundRect(ctx, infoX, ctaY, ctaW, ctaH, 48);
  ctx.fill();

  ctx.font = '900 34px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.fillText('LINK NO 1º COMENTÁRIO E NA BIO', W / 2, ctaY + 60);
  ctx.textAlign = 'left';

  return canvas;
}

// ── Pipeline Principal de Geração de Shorts ────────────────────────────────────

export async function generateShorts({
  product,
  canal = 'Achadinhos do Dia',
  siteUrl = 'https://achadinhosdodia.com.br',
  withAudio = true,
  outputPath,
  onProgress,
}) {
  const ffmpeg = findFFmpeg();
  const piperConfig = withAudio ? findPiper() : null;

  const tmpDir = join(ROOT, `.tmp_shorts_frames_${Date.now()}`);
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  onProgress?.('Carregando foto do produto em alta definição...');

  if (product.imageUrl) {
    try {
      product._img = await fetchImageWithRetry(product.imageUrl);
    } catch (err) {
      console.warn('Erro ao baixar foto:', err.message);
    }
  }

  // 1. Narração estilo TechZone para Shorts (rápida, 10 a 14s)
  const shortTitle = getShortName(product.name);
  const benefit = getBenefit(product.name);
  const priceSpoken = formatSpokenPrice(product.price);
  const discountText = product.discount || product.discountRate ? `com ${product.discount || product.discountRate}% de desconto` : 'com frete super rápido';

  const scriptText = `Olha só esse achadinho incrível que eu encontrei na Shopee! É o ${shortTitle}. ${benefit} E o melhor de tudo é o preço: está saindo por apenas ${priceSpoken}, ${discountText}. O link oficial com frete grátis tá fixado no primeiro comentário!`;

  let totalDuration = 12.0;
  let audioPath = null;

  if (withAudio) {
    onProgress?.('🎙️ Gerando narração rápida com a voz Antonio Neural (TechZone)...');
    const wavPath = join(tmpDir, 'shorts_narration.wav');
    await synthesizeVoiceUnified({
      text: scriptText,
      outWavPath: wavPath,
      ffmpegBin: ffmpeg,
      piperConfig,
    });

    const rawDur = getWavDuration(wavPath);
    totalDuration = Math.max(9.0, rawDur + 0.6); // Respiro de 0.6s

    const paddedWav = join(tmpDir, 'shorts_padded.wav');
    execSync(`"${ffmpeg}" -y -i "${wavPath}" -af "apad,atrim=0:${totalDuration.toFixed(3)}" "${paddedWav}"`, { stdio: 'ignore' });
    audioPath = paddedWav;
  }

  // 2. Renderizar frames verticais 9:16 (30 FPS)
  const totalFrames = Math.round(totalDuration * FPS);
  onProgress?.(`Renderizando ${totalFrames} frames verticais (1080x1920)...`);

  for (let f = 0; f < totalFrames; f++) {
    const progress = f / totalFrames;
    const canvas = renderShortsFrame(product, progress);
    const framePath = join(tmpDir, `frame_${String(f).padStart(5, '0')}.jpg`);
    // JPEG com qualidade 90: ~10x mais rápido que PNG e 90% menos uso de disco
    writeFileSync(framePath, canvas.toBuffer('image/jpeg', { quality: 90 }));

    if (f % 60 === 0) {
      onProgress?.(`Renderizados ${f}/${totalFrames} frames...`);
    }
  }

  // 3. Compilar Shorts MP4 com FFmpeg
  onProgress?.('Compilando vídeo vertical MP4 em 1080x1920...');

  const ffmpegArgs = [
    '-y',
    '-framerate', String(FPS),
    '-i', join(tmpDir, 'frame_%05d.jpg'),
  ];

  if (audioPath && existsSync(audioPath)) {
    ffmpegArgs.push('-i', audioPath);
  }

  ffmpegArgs.push(
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-threads', '0',
    '-crf', '21',
    '-pix_fmt', 'yuv420p',
  );

  if (audioPath && existsSync(audioPath)) {
    // Normalização broadcast EBU R128 (-16 LUFS) para YouTube Shorts
    ffmpegArgs.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11');
    ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  }

  ffmpegArgs.push(outputPath);

  await new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, ffmpegArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errOutput = '';
    proc.stderr.on('data', (d) => { errOutput += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0 && existsSync(outputPath)) resolve();
      else reject(new Error(`Falha ao compilar Shorts: ${errOutput}`));
    });
  });

  // Limpeza de arquivos temporários
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  onProgress?.('✅ Shorts 9:16 gerado com sucesso!');
  return { outputPath, duration: totalDuration, scriptText };
}

// ── Execução direta por CLI ────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('generate_shorts.mjs')) {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const outIdx = args.indexOf('--out');

  if (inputIdx !== -1 && outIdx !== -1) {
    const inputPath = args[inputIdx + 1];
    const outPath = args[outIdx + 1];
    const raw = readFileSync(inputPath, 'utf-8').replace(/^\uFEFF/, '');
    const payload = JSON.parse(raw);

    generateShorts({
      product: payload.product,
      canal: payload.canal,
      siteUrl: payload.siteUrl,
      withAudio: payload.withAudio !== false,
      outputPath: outPath,
      onProgress: (m) => console.log(m),
    })
      .then(() => {
        console.log('✅ Shorts gerado com sucesso em:', outPath);
        process.exit(0);
      })
      .catch((e) => {
        console.error('❌ Erro ao gerar Shorts:', e);
        process.exit(1);
      });
  }
}
