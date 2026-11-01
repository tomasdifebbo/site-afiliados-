/**
 * 📹 EXTRATOR DE VÍDEO DO VENDEDOR SHOPEE
 * Executado via Node.js puro com Stealth Puppeteer
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export async function extractShopeeVideo(targetUrl) {
  let url = (targetUrl || '').trim().replace(/^["']|["']$/g, '');

  // 1. Se já for link direto de vídeo da Shopee (VOD, CDN ou MP4)
  if (
    url.includes('vod.susercontent.com') ||
    url.includes('cv.shopee') ||
    url.includes('mms.vod') ||
    /\.(mp4|webm|mov)(\?.*)?$/i.test(url)
  ) {
    return {
      success: true,
      videoUrl: url,
      allVideos: [{ url, title: 'Vídeo Direto Shopee', type: 'direct' }],
      source: 'direct_vod',
    };
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://shopee.com.br/product/${url}`;
    }

    let shopId;
    let itemId;
    const m1 = url.match(/product\/(\d+)\/(\d+)/);
    const m2 = url.match(/-i\.(\d+)\.(\d+)/);
    if (m1) {
      shopId = m1[1];
      itemId = m1[2];
    } else if (m2) {
      shopId = m2[1];
      itemId = m2[2];
    }

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    let videoFound = null;
    const allVideos = [];

    page.on('response', async (res) => {
      const u = res.url();
      if (u.includes('vod.susercontent.com') || u.includes('cv.shopee') || u.includes('mms.vod') || u.endsWith('.mp4')) {
        if (!videoFound) videoFound = u;
        if (!allVideos.some((v) => v.url === u)) {
          allVideos.push({
            url: u,
            title: u.includes('review') ? 'Vídeo de Comentário / Avaliação' : 'Vídeo da Galeria',
            type: u.includes('review') ? 'review' : 'gallery',
          });
        }
      }

      // Intercepta respostas de avaliações / comentários com vídeos
      if (u.includes('get_ratings') || u.includes('rating')) {
        try {
          const json = await res.json();
          const ratings = json.data?.ratings || [];
          for (const r of ratings) {
            const vids = r.videos || r.item_rating?.videos || [];
            for (const v of vids) {
              const vidUrl = v.url || (v.video_id ? `https://cv.shopee.com.br/video/${v.video_id}.mp4` : null);
              if (vidUrl && !allVideos.some((existing) => existing.url === vidUrl)) {
                if (!videoFound) videoFound = vidUrl;
                allVideos.push({
                  url: vidUrl,
                  title: `Vídeo de Avaliação (${r.rating_star || 5}★: ${r.comment ? r.comment.slice(0, 35) + '...' : 'Comprador'})`,
                  type: 'review',
                  rating: r.rating_star || 5,
                });
              }
            }
          }
        } catch {}
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => null);

    // Rola a página para acionar carregamento de comentários e avaliações com vídeos
    await page.evaluate(async () => {
      window.scrollBy(0, 800);
      await new Promise((r) => setTimeout(r, 1200));
      window.scrollBy(0, 1200);
    }).catch(() => null);

    await new Promise((r) => setTimeout(r, 4000));
    const title = await page.title().catch(() => null);

    if (videoFound || allVideos.length > 0) {
      return {
        success: true,
        videoUrl: videoFound || allVideos[0].url,
        allVideos,
        title,
        shopId,
        itemId,
      };
    }

    return {
      success: false,
      shopId,
      itemId,
      error: 'Nenhum vídeo foi encontrado na galeria ou nos comentários para este anúncio.',
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

// Execução CLI
if (process.argv[2]) {
  const target = process.argv.slice(2).join(' ');
  extractShopeeVideo(target)
    .then((result) => {
      console.log(JSON.stringify(result));
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error(JSON.stringify({ success: false, error: err.message }));
      process.exit(1);
    });
}
