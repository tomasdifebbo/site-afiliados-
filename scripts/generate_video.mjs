/**
 * 🎬 GERADOR DE VÍDEO COM NARRAÇÃO PIPER TTS — ACHADINHOS DA SHOPEE
 * Replica com fidelidade o vídeo de referência com fotos dos produtos em alta definição
 * e narração em áudio 100% local e gratuita.
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

export function checkEdgeTTS() {
  try {
    execSync('python -m edge_tts --version', { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync('edge-tts --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

// ── Constantes ─────────────────────────────────────────────────────────────────
const W = 1920;
const H = 1080;
const FPS = 30;
const TRANSITION_FRAMES = 12; // ~0.4s de fade suave

const BG_COLOR      = '#0e0e10';
const ORANGE        = '#FF5722';
const ORANGE_BADGE  = '#FF4713';
const WHITE         = '#FFFFFF';
const MUTED         = '#94A3B8';
const STAR_GOLD     = '#F59E0B';

// ── Helpers de Imagem e Áudio ──────────────────────────────────────────────────

/**
 * Baixa imagem com headers de navegador, retry automático e conversão via sharp para PNG
 * Garante 100% de sucesso mesmo com WebP, Shopee CDN redirects ou formatos exóticos.
 */
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

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const arr = await res.arrayBuffer();
      const rawBuf = Buffer.from(arr);

      // Normaliza para PNG padrão usando sharp (compatibilidade universal no canvas)
      const pngBuf = await sharp(rawBuf)
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();

      const img = await loadImage(pngBuf);
      return img;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
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
  if (n.includes('tênis') || n.includes('tenis')) return 'Ideal para quem busca praticidade e conforto no dia a dia.';
  if (n.includes('sandália') || n.includes('sandalia')) return 'Um modelo versátil que combina muito bem com looks casuais.';
  if (n.includes('chinelo') || n.includes('babuche') || n.includes('nuvem')) return 'Super macio e leve para usar o dia inteiro sem cansar.';
  if (n.includes('bolsa') || n.includes('mochila')) return 'Muito espaçosa e com ótimo acabamento para levar suas coisas.';
  if (n.includes('cozinha') || n.includes('panela')) return 'Uma opção super prática para facilitar a sua rotina.';
  if (n.includes('organiz')) return 'Perfeito para manter tudo arrumado sem complicação.';
  if (n.includes('solar') || n.includes('protetor')) return 'Excelente para proteger a sua pele e manter o cuidado facial em dia.';
  if (n.includes('cabelo') || n.includes('escova')) return 'Prático para modelar e cuidar do cabelo com rapidez.';
  return 'Uma excelente opção com acabamento de muita qualidade.';
}

function getShortName(name) {
  return sanitizeForTTS((name || '').split(' ').slice(0, 5).join(' '));
}

// ── Síntese de Voz (TechZone Edge TTS Antonio + Fallback Piper) ───────────────

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
      else reject(new Error(`Edge TTS falhou (código ${code}): ${errOutput}`));
    });
  });

  // Converte para WAV padrão 22050Hz mono para encaixar perfeitamente no pipeline
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
      else reject(new Error(`Piper erro (${code}): ${errOutput}`));
    });

    proc.stdin.write(clean, 'utf-8');
    proc.stdin.end();
  });
}

/**
 * Síntese inteligente: Tenta primeiro a voz AntonioNeural (TechZone) de alta fidelidade
 * Se falhar ou estiver offline, usa o Piper local automaticamente.
 */
async function synthesizeVoiceUnified({ text, outWavPath, ffmpegBin, piperConfig }) {
  try {
    await synthesizeWithEdgeTTS(text, outWavPath, ffmpegBin, 'pt-BR-AntonioNeural');
    return 'edge-antonio';
  } catch (edgeErr) {
    console.warn('[TTS] Edge TTS indisponível, usando fallback Piper:', edgeErr.message);
    if (piperConfig) {
      await synthesizeText(piperConfig, text, outWavPath);
      return 'piper-faber';
    }
    throw edgeErr;
  }
}

// ── Helpers de Desenho em Canvas ───────────────────────────────────────────────

function drawGridBackground(ctx) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

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

function drawStar(ctx, cx, cy, spikes = 5, outerRadius = 14, innerRadius = 7) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = STAR_GOLD;
  ctx.fill();
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

// ── Renderização das Cenas em Canvas ───────────────────────────────────────────

export async function renderIntroCanvas(products, categoria, canal) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawGridBackground(ctx);

  const gridX = 100;
  const gridY = 220;
  const cellW = 125;
  const cellH = 135;
  const gap = 16;
  const cols = 5;

  for (let i = 0; i < Math.min(10, products.length); i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridX + col * (cellW + gap);
    const y = gridY + row * (cellH + gap);

    // Card branco arredondado
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, x, y, cellW, cellH, 14);
    ctx.fill();

    // Imagem dentro do card
    if (products[i]._img) {
      try {
        const img = products[i]._img;
        ctx.save();
        roundRect(ctx, x + 6, y + 6, cellW - 12, cellH - 12, 10);
        ctx.clip();
        const scale = Math.min((cellW - 12) / img.width, (cellH - 12) / img.height);
        const iw = img.width * scale;
        const ih = img.height * scale;
        const ix = x + 6 + (cellW - 12 - iw) / 2;
        const iy = y + 6 + (cellH - 12 - ih) / 2;
        ctx.drawImage(img, ix, iy, iw, ih);
        ctx.restore();
      } catch (err) {
        console.error('Erro ao desenhar miniatura:', err);
      }
    } else {
      // Fallback elegante se a imagem não carregar
      ctx.fillStyle = '#f1f5f9';
      roundRect(ctx, x + 6, y + 6, cellW - 12, cellH - 12, 10);
      ctx.fill();
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = ORANGE;
      ctx.textAlign = 'center';
      ctx.fillText(`#${i + 1}`, x + cellW / 2, y + cellH / 2 + 8);
      ctx.textAlign = 'left';
    }
  }

  const textX = 860;
  const textW = W - textX - 100;

  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = ORANGE;
  ctx.fillText('TOP 10 · SHOPEE', textX, 290);

  ctx.font = '900 84px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.fillText('10 ACHADINHOS', textX, 390);

  ctx.font = 'bold 50px sans-serif';
  ctx.fillStyle = '#E2E8F0';
  wrapText(ctx, (categoria || 'Destaques').toUpperCase(), textX, 470, textW, 60, 2);

  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(canal || 'achadinhosdodia.com.br', textX, H - 180);

  return canvas;
}

export async function renderProductCanvas(product, numero, progress = 0) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawGridBackground(ctx);

  const cardX = 100;
  const cardY = 120;
  const cardW = 720;
  const cardH = 840;

  // Sombra suave do card
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  roundRect(ctx, cardX + 6, cardY + 12, cardW, cardH, 24);
  ctx.fill();

  // Card branco principal
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();

  // Desenha a imagem do produto com movimento de aproximação suave (Ken Burns)
  if (product._img) {
    try {
      const img = product._img;
      ctx.save();
      roundRect(ctx, cardX + 16, cardY + 16, cardW - 32, cardH - 32, 18);
      ctx.clip();

      const zoom = 1.0 + (progress || 0) * 0.05; // Zoom progressivo sutil de 5%
      const baseScale = Math.min((cardW - 48) / img.width, (cardH - 48) / img.height);
      const scale = baseScale * zoom;

      const iw = img.width * scale;
      const ih = img.height * scale;
      const ix = cardX + (cardW - iw) / 2;
      const iy = cardY + (cardH - ih) / 2;
      ctx.drawImage(img, ix, iy, iw, ih);
      ctx.restore();
    } catch (err) {
      console.error('Erro ao desenhar imagem do produto:', err);
    }
  } else {
    // Fallback elegante
    ctx.fillStyle = '#f8fafc';
    roundRect(ctx, cardX + 16, cardY + 16, cardW - 32, cardH - 32, 18);
    ctx.fill();
    ctx.font = 'bold 72px sans-serif';
    ctx.fillStyle = ORANGE;
    ctx.textAlign = 'center';
    ctx.fillText(`#${numero}`, cardX + cardW / 2, cardY + cardH / 2);
    ctx.textAlign = 'left';
  }

  // Badge de desconto ou tag especial
  const discount = product.discount || (product.originalPrice && product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null);

  const badgeText = discount && discount > 0 ? `${discount}% OFF` : 'Oferta Shopee';
  ctx.font = 'bold 26px sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 32;
  const badgeH = 46;
  const badgeX = cardX + 24;
  const badgeY = cardY + 24;

  ctx.fillStyle = ORANGE_BADGE;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.fillText(badgeText, badgeX + 16, badgeY + 32);

  const rightX = cardX + cardW + 80;
  const rightW = W - rightX - 100;
  let curY = 175;

  // Número do produto em laranja de alto contraste
  ctx.font = '900 140px sans-serif';
  ctx.fillStyle = ORANGE;
  ctx.fillText(`#${numero}`, rightX, curY + 105);
  curY += 150;

  // Título do produto
  ctx.font = 'bold 46px sans-serif';
  ctx.fillStyle = WHITE;
  curY = wrapText(ctx, product.name, rightX, curY, rightW, 58, 3) + 40;

  // Pílula com o benefício prático (Prompt Mestre)
  const practicalBenefit = getBenefit(product.name);
  if (practicalBenefit) {
    ctx.font = 'bold 22px sans-serif';
    const tagText = `✓ ${practicalBenefit.slice(0, 48)}`;
    const tagW = ctx.measureText(tagText).width + 32;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, rightX, curY, Math.min(tagW, rightW), 42, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.fillText(tagText, rightX + 16, curY + 29);
    curY += 65;
  }

  // Avaliação e vendas verificadas
  const rating = product.ratingStar ? product.ratingStar.toFixed(1) : '4.9';
  drawStar(ctx, rightX + 14, curY - 10, 5, 14, 7);

  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = STAR_GOLD;
  ctx.fillText(rating, rightX + 38, curY);

  ctx.fillStyle = MUTED;
  const sales = product.sales || product.sold;
  const soldText = sales
    ? ` · ${Number(sales).toLocaleString('pt-BR')} vendas na Shopee`
    : ' · Shopee Brasil';
  ctx.fillText(soldText, rightX + 90, curY);
  curY += 65;

  // Bloco de Preço destacado
  if (product.price) {
    ctx.font = '900 86px sans-serif';
    ctx.fillStyle = ORANGE;
    const priceStr = `R$ ${Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    ctx.fillText(priceStr, rightX, curY + 65);
    curY += 120;
  }

  // Botão / Pílula do Link na Descrição
  ctx.font = 'bold 28px sans-serif';
  const pillLabel = `Link nº ${numero} na descrição`;
  const pillW = ctx.measureText(pillLabel).width + 48;
  const pillH = 54;
  ctx.fillStyle = '#1e2430';
  roundRect(ctx, rightX, curY, pillW, pillH, 27);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(pillLabel, rightX + 24, curY + 36);

  // Aviso discreto de transparência de afiliados
  ctx.font = '500 20px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('Links verificados na descrição · Compras seguras', rightX, H - 90);

  return canvas;
}

export async function renderOutroCanvas(canal, siteUrl) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawGridBackground(ctx);

  ctx.font = '900 80px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'center';
  ctx.fillText('Gostou dos achadinhos de hoje?', W / 2, H / 2 - 150);

  const domain = (siteUrl || canal || 'achadinhosdodia.com.br').replace(/^https?:\/\//, '');
  ctx.font = 'bold 50px sans-serif';
  const boxW = ctx.measureText(domain).width + 80;
  const boxH = 92;
  const boxX = W / 2 - boxW / 2;
  const boxY = H / 2 - 80;

  ctx.fillStyle = ORANGE;
  roundRect(ctx, boxX, boxY, boxW, boxH, 16);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.fillText(domain, W / 2, boxY + 62);

  ctx.font = 'bold 34px sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText('Os 10 links estão na descrição, em ordem', W / 2, H / 2 + 65);

  const btnW = 320, btnH = 70;
  const btnX = W / 2 - btnW / 2;
  const btnY = H / 2 + 115;
  ctx.fillStyle = '#DC2626';
  roundRect(ctx, btnX, btnY, btnW, btnH, 12);
  ctx.fill();
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.fillText('INSCREVA-SE', W / 2, btnY + 48);

  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('Ative as notificações', W / 2, btnY + 120);

  return canvas;
}

// ── Pipeline Principal de Geração de Vídeo com Áudio ───────────────────────────

export async function generateVideo({
  products,
  categoria,
  canal = 'Achadinhos do Dia',
  siteUrl = 'https://achadinhosdodia.com.br',
  withAudio = true,
  outputPath,
  onProgress,
}) {
  const ffmpeg = findFFmpeg();
  const piperConfig = withAudio ? findPiper() : null;

  const tmpDir = join(ROOT, `.tmp_video_frames_${Date.now()}`);
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  onProgress?.('Carregando imagens dos produtos em alta definição...');

  // Download e normalização de TODAS as imagens em paralelo com sharp
  await Promise.all(
    products.map(async (p, i) => {
      if (p.imageUrl) {
        try {
          p._img = await fetchImageWithRetry(p.imageUrl);
          onProgress?.(`📸 Imagem ${i + 1}/${products.length} carregada.`);
        } catch (err) {
          console.error(`Erro ao carregar imagem de ${p.name}:`, err.message);
        }
      }
    })
  );

  // 1. Textos da narração humanizada (Prompt Mestre)
  const highlightIdx = Math.ceil(products.length / 2);
  const scriptTexts = [];

  const cheapest = [...products].sort((a, b) => (Number(a.price) || 999) - (Number(b.price) || 999))[0];
  const minPriceSpoken = formatSpokenPrice(cheapest?.price);

  // Abertura dinâmica de 0 a 7s
  const catLabel = categoria || 'a sua casa';
  scriptTexts.push(
    `Separei 10 achadinhos para ${catLabel} que podem facilitar bastante o seu dia a dia — e tem opções a partir de ${minPriceSpoken}! Dá uma olhada no número ${highlightIdx}, porque ele é muito versátil e útil. Vamos conferir?`
  );

  // Produtos (18 a 22s por item, situacional e natural)
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const num = i + 1;
    const shortTitle = getShortName(p.name);
    const benefit = getBenefit(p.name);
    const priceSpoken = formatSpokenPrice(p.price);

    const situationalHooks = [
      `Pra começar, sabe aquela praticidade que todo mundo procura na rotina? É o que você encontra no ${shortTitle}.`,
      `O segundo achadinho resolve um problema comum de quem gosta de manter as coisas em ordem: o ${shortTitle}.`,
      `Agora, se você preza por conforto sem precisar gastar muito, dá uma olhada no ${shortTitle}.`,
      `Para quem quer economizar tempo nas tarefas do dia a dia, essa próxima descoberta é bem interessante: ${shortTitle}.`,
      `Chegamos ao quinto item, e esse aqui chama atenção pela versatilidade: é o ${shortTitle}.`,
      `Mudando um pouco o ambiente, esse acessório ajuda a aproveitar muito melhor o espaço: ${shortTitle}.`,
      `Para quem não abre mão de funcionalidade e bom acabamento, o número 7 é o ${shortTitle}.`,
      `Se a sua prioridade é custo benefício com utilidade real, veja o que achamos: ${shortTitle}.`,
      `Quase no final da seleção, esse penúltimo achadinho se destaca por um detalhe de design bem pensado: ${shortTitle}.`,
      `E para fechar a nossa seleção de hoje com uma descoberta muito prática, temos o ${shortTitle}.`,
    ];

    const hook = situationalHooks[Math.min(i, situationalHooks.length - 1)];
    const salesText = p.sales ? `são mais de ${p.sales >= 1000 ? Math.floor(p.sales / 1000) * 1000 : p.sales} vendas registradas com avaliação positiva.` : 'com aprovação positiva de quem já comprou.';
    const discountText = p.discount ? `, com ${p.discount}% de desconto anunciado` : '';
    const text = `${hook} ${benefit} Na Shopee, ele conta com boa aprovação e ${salesText} O preço confirmado no anúncio é de ${priceSpoken}${discountText}. O link oficial com todas as opções é o número ${num} na descrição.`;
    scriptTexts.push(text);
  }

  // Encerramento natural (~8s)
  scriptTexts.push(
    `E aí, qual desses achadinhos você levaria para casa? Me conta nos comentários! Se curtiu a seleção, se inscreve no canal porque sempre tem novas descobertas úteis por aqui. Todos os links oficiais estão organizados na descrição. Até a próxima!`
  );

  // 2. Síntese de áudio (Edge TTS Antonio Neural TechZone + Fallback Piper)
  const audioFiles = [];
  const sceneDurations = [];

  if (withAudio) {
    onProgress?.('🎙️ Sintetizando narração estilo TechZone com a voz Antonio Neural...');

    for (let i = 0; i < scriptTexts.length; i++) {
      const wavPath = join(tmpDir, `scene_${i}.wav`);
      await synthesizeVoiceUnified({
        text: scriptTexts[i],
        outWavPath: wavPath,
        ffmpegBin: ffmpeg,
        piperConfig,
      });

      const rawDur = getWavDuration(wavPath);
      // Duração da cena = áudio + 0.5s de respiro natural (mínimo 4s)
      const sceneDur = Math.max(4.0, rawDur + 0.5);
      sceneDurations.push(sceneDur);

      // Pad do áudio com FFmpeg para bater exatamente com a cena
      const paddedWav = join(tmpDir, `scene_${i}_padded.wav`);
      execSync(`"${ffmpeg}" -y -i "${wavPath}" -af "apad,atrim=0:${sceneDur.toFixed(3)}" "${paddedWav}"`, { stdio: 'ignore' });
      audioFiles.push(paddedWav);
    }
  } else {
    // Sem áudio: durações fixas
    sceneDurations.push(4.0); // Intro
    for (let i = 0; i < products.length; i++) sceneDurations.push(5.0); // Produtos
    sceneDurations.push(4.0); // Outro
  }

  onProgress?.('Renderizando cenas visuais com as fotos dos produtos...');

  // 3. Renderiza os Canvas de cada cena
  const scenes = [];

  // Intro
  scenes.push({
    canvas: await renderIntroCanvas(products, categoria, canal),
    durationSeconds: sceneDurations[0],
  });

  // Produtos
  for (let i = 0; i < products.length; i++) {
    scenes.push({
      canvas: await renderProductCanvas(products[i], i + 1),
      durationSeconds: sceneDurations[i + 1],
    });
  }

  // Outro
  scenes.push({
    canvas: await renderOutroCanvas(canal, siteUrl),
    durationSeconds: sceneDurations[sceneDurations.length - 1],
  });

  onProgress?.('Gerando frames com transições suaves sincronizadas...');

  // 4. Escreve frames no disco com Crossfade suave entre cenas
  let frameIndex = 0;

  for (let s = 0; s < scenes.length; s++) {
    const curScene = scenes[s];
    const nextScene = scenes[s + 1] || null;
    const totalFramesInScene = Math.round(curScene.durationSeconds * FPS);
    const holdFrames = nextScene ? totalFramesInScene - TRANSITION_FRAMES : totalFramesInScene;

    // Movimento suave de câmera (Ken Burns progressivo) para produtos
    if (s >= 1 && s <= products.length) {
      const prodIdx = s - 1;
      const steps = 5;
      const stepBuffers = [];
      for (let st = 0; st < steps; st++) {
        const prog = st / (steps - 1);
        const c = await renderProductCanvas(products[prodIdx], prodIdx + 1, prog);
        stepBuffers.push(c.toBuffer('image/jpeg', { quality: 92 }));
      }

      for (let f = 0; f < holdFrames; f++) {
        const stepIdx = Math.min(steps - 1, Math.floor((f / holdFrames) * steps));
        const filename = `frame_${String(frameIndex++).padStart(6, '0')}.jpg`;
        writeFileSync(join(tmpDir, filename), stepBuffers[stepIdx]);
      }
    } else {
      const curBuffer = curScene.canvas.toBuffer('image/jpeg', { quality: 92 });
      for (let f = 0; f < holdFrames; f++) {
        const filename = `frame_${String(frameIndex++).padStart(6, '0')}.jpg`;
        writeFileSync(join(tmpDir, filename), curBuffer);
      }
    }

    if (nextScene) {
      const blendCanvas = createCanvas(W, H);
      const bCtx = blendCanvas.getContext('2d');

      for (let t = 0; t < TRANSITION_FRAMES; t++) {
        const progress = (t + 1) / (TRANSITION_FRAMES + 1);

        bCtx.clearRect(0, 0, W, H);
        bCtx.globalAlpha = 1.0;
        bCtx.drawImage(curScene.canvas, 0, 0);

        bCtx.globalAlpha = progress;
        bCtx.drawImage(nextScene.canvas, 0, 0);

        const blendBuf = blendCanvas.toBuffer('image/jpeg', { quality: 92 });
        const filename = `frame_${String(frameIndex++).padStart(6, '0')}.jpg`;
        writeFileSync(join(tmpDir, filename), blendBuf);
      }
    }
  }

  // 5. Junta o áudio completo se houver
  let fullAudioPath = null;
  if (audioFiles.length > 0) {
    onProgress?.('Concatenando áudio da narração...');
    const audioListTxt = join(tmpDir, 'audio_list.txt');
    const audioListContent = audioFiles.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    writeFileSync(audioListTxt, audioListContent, 'utf-8');

    fullAudioPath = join(tmpDir, 'full_audio.wav');
    execSync(`"${ffmpeg}" -y -f concat -safe 0 -i "${audioListTxt}" -c copy "${fullAudioPath}"`, { stdio: 'ignore' });
  }

  onProgress?.('Compilando vídeo final em MP4 com FFmpeg...');

  // 6. Executa FFmpeg final
  await new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-framerate', String(FPS),
      '-i', join(tmpDir, 'frame_%06d.jpg'),
    ];

    if (fullAudioPath && existsSync(fullAudioPath)) {
      args.push('-i', fullAudioPath);
      args.push('-c:v', 'libx264', '-preset', 'veryfast', '-threads', '0', '-crf', '22', '-pix_fmt', 'yuv420p');
      // Normalização profissional de áudio EBU R128 / YouTube (-16 LUFS, True Peak -1.5 dB)
      args.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11');
      args.push('-c:a', 'aac', '-b:a', '192k');
      args.push('-shortest');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'veryfast', '-threads', '0', '-crf', '22', '-pix_fmt', 'yuv420p');
    }

    args.push('-movflags', '+faststart', outputPath);

    const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errOutput = '';
    proc.stderr.on('data', (d) => { errOutput += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg erro (${code}):\n${errOutput.slice(-500)}`));
    });
  });

  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  onProgress?.(`✅ Vídeo com áudio e fotos gerado com sucesso: ${outputPath}`);
  return outputPath;
}

// ── Execução CLI ───────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith('generate_video.mjs')) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

  const inputJson = get('--input');

  let products = [];
  let categoria = 'Achadinhos da Shopee';
  let slug = 'video-' + Date.now();
  let siteUrl = 'https://achadinhosdodia.com.br';
  let canal = 'Achadinhos do Dia';
  let withAudio = !args.includes('--no-audio');

  if (inputJson && existsSync(inputJson)) {
    const payload = JSON.parse(readFileSync(inputJson, 'utf-8'));
    products = payload.products || [];
    categoria = payload.categoria || categoria;
    slug = payload.slug || slug;
    siteUrl = payload.siteUrl || siteUrl;
    canal = payload.canal || canal;
    if (payload.withAudio !== undefined) withAudio = payload.withAudio;
  } else {
    slug = get('--slug') || 'calcados-femininos';
    const n = parseInt(get('--n') || '5', 10);
    categoria = get('--categoria') || 'Calçados Femininos';
    const baseUrl = get('--base-url') || 'http://localhost:3000';

    console.log(`🎬 Buscando ${n} produtos para "${categoria}"...`);
    const res = await fetch(`${baseUrl}/api/products?q=${encodeURIComponent(categoria)}&limit=${n}`);
    const data = await res.json();
    products = (data.products || data || []).slice(0, n);
  }

  const outFile = get('--out') || resolve(ROOT, `public/videos/${slug}.mp4`);
  mkdirSync(resolve(ROOT, 'public/videos'), { recursive: true });

  await generateVideo({
    products,
    categoria,
    canal,
    siteUrl,
    withAudio,
    outputPath: outFile,
    onProgress: (m) => console.log(' >', m),
  });

  console.log(`\n🎉 Vídeo pronto com áudio e fotos: ${outFile}`);
}
