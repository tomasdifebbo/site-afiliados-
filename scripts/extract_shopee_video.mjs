/**
 * 📹 EXTRATOR DE VÍDEO DO VENDEDOR SHOPEE
 * Executado via Node.js puro com Stealth Puppeteer
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export async function extractShopeeVideo(targetUrl) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    let url = (targetUrl || '').trim().replace(/^["']|["']$/g, '');
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

    page.on('response', (res) => {
      const u = res.url();
      if (u.includes('vod.susercontent.com') || u.includes('cv.shopee') || u.includes('mms.vod')) {
        videoFound = u;
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 }).catch(() => null);
    const title = await page.title().catch(() => null);

    if (videoFound) {
      return {
        success: true,
        videoUrl: videoFound,
        title,
        shopId,
        itemId,
      };
    }

    return {
      success: false,
      shopId,
      itemId,
      error: 'O anúncio foi acessado, mas este vendedor não incluiu vídeo no produto.',
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
