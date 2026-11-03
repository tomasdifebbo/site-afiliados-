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
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Caminhos e Configuração ────────────────────────────────────────────────────
const localAppData = process.env.LOCALAPPDATA || '';
const userProfile = process.env.USERPROFILE || '';

const FFMPEG_PATHS = [
  process.env.FFMPEG_PATH,
  ffmpegInstaller?.path,
  'ffmpeg',
  localAppData ? join(localAppData, 'Microsoft/WinGet/Links/ffmpeg.exe') : null,
  'C:/Program Files/ffmpeg/bin/ffmpeg.exe',
  'C:/ffmpeg/bin/ffmpeg.exe',
].filter(Boolean);

const PIPER_PATHS = [
  process.env.PIPER_PATH,
  userProfile ? join(userProfile, 'AppData/Roaming/Python/Python314/Scripts/piper.exe') : null,
  userProfile ? join(userProfile, 'AppData/Roaming/Python/Python312/Scripts/piper.exe') : null,
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

export function findFFprobe() {
  const probeCandidates = [
    process.env.FFPROBE_PATH,
    ffprobeInstaller?.path,
    'ffprobe',
    localAppData ? join(localAppData, 'Microsoft/WinGet/Links/ffprobe.exe') : null,
  ].filter(Boolean);

  for (const p of probeCandidates) {
    try {
      execSync(`"${p}" -version`, { stdio: 'ignore' });
      return p;
    } catch {}
  }
  return null;
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

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function synthesizeWithGeminiTTS(text, outWavPath, apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY não configurada.');

  const clean = sanitizeForTTS(text);
  const models = ['gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Fale em português do Brasil com voz entusiasmada e profissional para vídeo viral de achadinho da Shopee:\n\n${clean}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck',
                },
              },
            },
          },
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.[0];
      if (!part?.inlineData?.data) continue;

      const rawBuf = Buffer.from(part.inlineData.data, 'base64');
      const mime = part.inlineData.mimeType || '';

      const finalWav = mime.includes('wav') ? rawBuf : pcmToWav(rawBuf, 24000, 1, 16);
      writeFileSync(outWavPath, finalWav);
      return 'gemini-tts';
    } catch {}
  }

  throw new Error('Todas as tentativas com Gemini TTS falharam');
}

async function synthesizeVoiceUnified({ text, outWavPath, ffmpegBin, piperConfig, apiKey }) {
  // 1. Tenta Gemini TTS Oficial
  try {
    await synthesizeWithGeminiTTS(text, outWavPath, apiKey);
    return 'gemini-tts';
  } catch (geminiErr) {
    // 2. Fallback para Edge TTS
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

export function renderShortsOverlay(product) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Badge Superior Shopee com Logo Oficial
  const badgeY = 120;
  const badgeH = 74;
  const badgeW = 760;
  const badgeX = (W - badgeW) / 2;

  // Sombra suave do badge
  ctx.fillStyle = 'rgba(255, 87, 34, 0.3)';
  roundRect(ctx, badgeX - 4, badgeY - 2, badgeW + 8, badgeH + 4, 37);
  ctx.fill();

  // Fundo gradiente do badge
  ctx.fillStyle = ORANGE;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 37);
  ctx.fill();

  if (product._logoImg) {
    const logoSize = 54;
    const logoX = badgeX + 16;
    const logoY = badgeY + (badgeH - logoSize) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(product._logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    ctx.font = '900 27px sans-serif';
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'center';
    ctx.fillText('ACHADINHOS DO DIA • OFERTA SHOPEE', W / 2 + 25, badgeY + 47);
  } else {
    ctx.font = '900 28px sans-serif';
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'center';
    ctx.fillText('ACHADINHO VIRAL DA SHOPEE', W / 2, badgeY + 46);
  }
  ctx.textAlign = 'left';

  // Tag "Oferta Shopee" sobre a área do vídeo
  const cardX = 80;
  const cardY = 240;
  ctx.fillStyle = '#FF4713';
  roundRect(ctx, cardX + 36, cardY + 36, 190, 48, 12);
  ctx.fill();
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.fillText('Oferta Shopee', cardX + 54, cardY + 68);

  // Moldura sutil elegante ao redor do vídeo
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 4;
  roundRect(ctx, cardX, cardY, 920, 980, 28);
  ctx.stroke();

  // Informações do Produto (Abaixo do Card)
  const infoX = 80;
  let curY = 1270;

  const rating = product.ratingStar ? product.ratingStar.toFixed(1) : '4.9';
  const sales = product.sales || 1500;
  const salesStr = sales >= 1000 ? `${Math.floor(sales / 1000)} mil` : `${sales}`;

  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = STAR_GOLD;
  ctx.fillText(`★ ${rating}`, infoX, curY);

  ctx.fillStyle = MUTED;
  ctx.fillText(` ·  mais de ${salesStr} vendas na Shopee`, infoX + 90, curY);
  curY += 60;

  ctx.font = '800 46px sans-serif';
  ctx.fillStyle = WHITE;
  curY = wrapText(ctx, product.name || 'Achadinho Incrível', infoX, curY, 920, 56, 2) + 25;

  const priceNum = Number(product.price || 0);
  const priceStr = `R$ ${priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  ctx.font = '900 80px sans-serif';
  ctx.fillStyle = ORANGE;
  ctx.fillText(priceStr, infoX, curY + 65);

  const priceWidth = ctx.measureText(priceStr).width;
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

  // Micro-badge de Frete Grátis e Cupons da Shopee (Gatilho de Conversão)
  const freteY = curY + 65 + 24;
  ctx.fillStyle = '#059669';
  roundRect(ctx, infoX, freteY, 360, 44, 12);
  ctx.fill();
  ctx.font = '800 20px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.fillText('🚚 FRETE GRÁTIS + CUPOM DISPONÍVEL', infoX + 16, freteY + 29);

  // CTA Duplo de Alta Monetização (Comentário + Bio)
  const ctaY = 1680;
  const ctaW = 920;
  const ctaH = 96;

  ctx.fillStyle = 'rgba(255, 87, 34, 0.45)';
  roundRect(ctx, infoX - 4, ctaY - 4, ctaW + 8, ctaH + 8, 48);
  ctx.fill();

  ctx.fillStyle = WHITE;
  roundRect(ctx, infoX, ctaY, ctaW, ctaH, 48);
  ctx.fill();

  ctx.font = '900 32px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.fillText('🔥 COMENTE "QUERO" • LINK NA BIO & FIXADO', W / 2, ctaY + 60);
  ctx.textAlign = 'left';

  return canvas;
}
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

  // Carrega logo oficial do canal para o overlay se disponível
  const logoPath = join(ROOT, 'public', 'logo.png');
  if (existsSync(logoPath)) {
    try {
      product._logoImg = await loadImage(logoPath);
    } catch (err) {
      console.warn('Erro ao carregar logo oficial:', err.message);
    }
  }

  // 1. Narração estilo TechZone para Shorts (rápida, 10 a 14s)
  const shortTitle = getShortName(product.name);
  const benefit = getBenefit(product.name);
  const priceSpoken = formatSpokenPrice(product.price);
  const discountText = product.discount || product.discountRate ? `com ${product.discount || product.discountRate}% de desconto` : 'com frete super rápido';

  const defaultScript = `Olha só esse achadinho incrível que eu encontrei na Shopee! É o ${shortTitle}. ${benefit} E o melhor de tudo é o preço: está saindo por apenas ${priceSpoken}, ${discountText}. O link oficial com frete grátis tá fixado no primeiro comentário!`;
  const scriptText = product.scriptText ? product.scriptText.trim() : defaultScript;

  let totalDuration = 12.0;
  let audioPath = null;

  if (withAudio) {
    onProgress?.('🎙️ Gerando narração neural via Google Gemini Audio API...');
    const wavPath = join(tmpDir, 'shorts_narration.wav');
    await synthesizeVoiceUnified({
      text: scriptText,
      outWavPath: wavPath,
      ffmpegBin: ffmpeg,
      piperConfig,
      apiKey: product.apiKey,
    });

    const rawDur = getWavDuration(wavPath);
    totalDuration = Math.max(9.0, rawDur + 0.6); // Respiro de 0.6s

    const paddedWav = join(tmpDir, 'shorts_padded.wav');
    execSync(`"${ffmpeg}" -y -i "${wavPath}" -af "apad,atrim=0:${totalDuration.toFixed(3)}" "${paddedWav}"`, { stdio: 'ignore' });
    audioPath = paddedWav;
  }

  // 2. Verificar se há vídeo real do vendedor Shopee disponível
  let sellerLocalPath = null;
  if (product.sellerVideoUrl && typeof product.sellerVideoUrl === 'string' && product.sellerVideoUrl.startsWith('http')) {
    onProgress?.('Baixando vídeo real do vendedor da Shopee...');
    try {
      const vidRes = await fetch(product.sellerVideoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://shopee.com.br/',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (vidRes.ok) {
        const vPath = join(tmpDir, 'seller_source.mp4');
        const vBuf = Buffer.from(await vidRes.arrayBuffer());
        if (vBuf.length > 50000) {
          writeFileSync(vPath, vBuf);
          sellerLocalPath = vPath;
          onProgress?.('✅ Vídeo do vendedor baixado com sucesso!');
        }
      }
    } catch (err) {
      console.warn('Não foi possível baixar o vídeo do vendedor, usando imagem:', err.message);
    }
  }

  if (sellerLocalPath && existsSync(sellerLocalPath)) {
    // ── MODO VÍDEO DO VENDEDOR (Compositor FFmpeg direto em 1080x1920) ───────────
    onProgress?.('Compilando vídeo real com layout vertical 9:16 e voz neural...');
    const overlayPath = join(tmpDir, 'shorts_overlay.png');
    const overlayCanvas = renderShortsOverlay(product);
    writeFileSync(overlayPath, overlayCanvas.toBuffer('image/png'));

    const filterComplex = [
      '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5,colorchannelmixer=aa=0.45[bg]',
      '[0:v]scale=920:980:force_original_aspect_ratio=decrease,pad=920:980:(920-iw)/2:(980-ih)/2:color=black@0[fg]',
      '[bg][fg]overlay=80:240[with_fg]',
      '[with_fg][1:v]overlay=0:0[vout]',
    ].join(';');

    const ffmpegArgs = [
      '-y',
      '-stream_loop', '-1',
      '-i', sellerLocalPath,
      '-loop', '1',
      '-i', overlayPath,
    ];

    if (audioPath && existsSync(audioPath)) {
      ffmpegArgs.push('-i', audioPath);
    }

    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-threads', '0',
      '-crf', '21',
      '-pix_fmt', 'yuv420p',
      '-t', String(totalDuration.toFixed(3)),
    );

    if (audioPath && existsSync(audioPath)) {
      ffmpegArgs.push(
        '-map', '2:a',
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest'
      );
    }

    ffmpegArgs.push(outputPath);

    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpeg, ffmpegArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
      let errOutput = '';
      proc.stderr.on('data', (d) => { errOutput += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0 && existsSync(outputPath)) resolve();
        else reject(new Error(`Falha ao compilar Shorts com vídeo do vendedor: ${errOutput}`));
      });
    });
  } else {
    // ── MODO ESTÁTICO HD (Frames 9:16 com zoom suave) ──────────────────────────
    const totalFrames = Math.round(totalDuration * FPS);
    onProgress?.(`Renderizando ${totalFrames} frames verticais (1080x1920)...`);

    for (let f = 0; f < totalFrames; f++) {
      const progress = f / totalFrames;
      const canvas = renderShortsFrame(product, progress);
      const framePath = join(tmpDir, `frame_${String(f).padStart(5, '0')}.jpg`);
      writeFileSync(framePath, canvas.toBuffer('image/jpeg', { quality: 90 }));

      if (f % 60 === 0) {
        onProgress?.(`Renderizados ${f}/${totalFrames} frames...`);
      }
    }

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
  }

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
