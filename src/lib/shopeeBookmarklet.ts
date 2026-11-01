export function getShopeeBookmarkletCode(siteUrl = "https://achadinhos-do-dia-seven.vercel.app") {
  const code = `(async function() {
  if (!window.location.hostname.includes('shopee')) {
    alert('⚠️ Por favor, use este botão enquanto estiver navegando em um produto no site da Shopee!');
    return;
  }

  const existing = document.getElementById('shopee-video-harvester-modal');
  if (existing) existing.remove();

  const url = window.location.href;
  const m1 = url.match(/product\\/(\\d+)\\/(\\d+)/);
  const m2 = url.match(/-i\\.(\\d+)\\.(\\d+)/);
  const shopId = m1 ? m1[1] : (m2 ? m2[1] : null);
  const itemId = m1 ? m1[2] : (m2 ? m2[2] : null);

  const titleEl = document.querySelector('h1, div.vR6Kpt, .product-briefing span');
  const title = (titleEl ? titleEl.innerText : document.title).split('|')[0].trim();

  const priceEl = document.querySelector('.pqTWkA, .G27UVz');
  const price = priceEl ? priceEl.innerText.replace(/[^\\d,]/g, '').replace(',', '.') : '0';

  const imgEl = document.querySelector('div._1No_hL img, ._2-P4k9 img, .CXdr1J img, img');
  const imageUrl = imgEl ? imgEl.src : '';

  const modal = document.createElement('div');
  modal.id = 'shopee-video-harvester-modal';
  modal.style.cssText = 'position:fixed;bottom:24px;right:24px;width:380px;max-height:85vh;overflow-y:auto;background:#0f172a;color:#fff;border-radius:18px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,0.6);z-index:9999999;font-family:sans-serif;font-size:13px;line-height:1.4;border:2px solid #FF5722;';

  modal.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
    '<strong style="font-size:15px;color:#FF5722;display:flex;align-items:center;gap:6px;">🎬 Extrator de Vídeos Shopee</strong>' +
    '<button id="close-harvester-btn" style="background:#334155;border:none;color:#fff;border-radius:50%;width:24px;height:24px;cursor:pointer;font-weight:bold;">&times;</button>' +
    '</div>' +
    '<div id="harvester-status" style="color:#94a3b8;font-size:12px;margin-bottom:12px;">🔍 Varrendo galeria e comentários com vídeo...</div>' +
    '<div id="harvester-video-list" style="display:flex;flex-direction:column;gap:12px;"></div>';

  document.body.appendChild(modal);
  document.getElementById('close-harvester-btn').onclick = () => modal.remove();

  const videos = [];

  document.querySelectorAll('video').forEach((v, idx) => {
    const src = v.src || v.querySelector('source')?.src;
    if (src && !videos.some(item => item.url === src)) {
      videos.push({ url: src, title: 'Vídeo da Galeria (Em Reprodução)', type: 'galeria' });
    }
  });

  if (shopId && itemId) {
    try {
      const resItem = await fetch('/api/v4/item/get?itemid=' + itemId + '&shopid=' + shopId);
      if (resItem.ok) {
        const itemJson = await resItem.json();
        const vList = itemJson.data?.video_info_list || [];
        vList.forEach((v, idx) => {
          const vUrl = v.formats?.[0]?.url || (v.video_id ? 'https://cv.shopee.com.br/video/' + v.video_id + '.mp4' : null);
          if (vUrl && !videos.some(item => item.url === vUrl)) {
            videos.push({ url: vUrl, title: 'Vídeo Oficial da Galeria #' + (idx + 1), type: 'galeria' });
          }
        });
      }
    } catch (e) {}

    try {
      const resRatings = await fetch('/api/v2/item/get_ratings?filter=3&flag=1&itemid=' + itemId + '&limit=30&offset=0&shopid=' + shopId + '&type=0');
      if (resRatings.ok) {
        const ratingsJson = await resRatings.json();
        const ratings = ratingsJson.data?.ratings || [];
        ratings.forEach((r, idx) => {
          const vids = r.videos || r.item_rating?.videos || [];
          vids.forEach((v) => {
            const vUrl = v.url || (v.video_id ? 'https://cv.shopee.com.br/video/' + v.video_id + '.mp4' : null);
            if (vUrl && !videos.some(item => item.url === vUrl)) {
              videos.push({
                url: vUrl,
                title: 'Comentário ' + (r.rating_star ? '★ ' + r.rating_star : 'Cliente') + ': ' + (r.comment ? r.comment.slice(0, 32) + '...' : 'Teste real'),
                type: 'comentario',
                author: r.author_username || 'Comprador'
              });
            }
          });
        });
      }
    } catch (e) {}
  }

  const statusEl = document.getElementById('harvester-status');
  const listEl = document.getElementById('harvester-video-list');

  if (videos.length === 0) {
    statusEl.innerHTML = '<span style="color:#ef4444;">⚠️ Nenhum vídeo encontrado neste anúncio (nem na galeria, nem nos comentários).</span>';
    return;
  }

  statusEl.innerHTML = '<span style="color:#22c55e;">✅ ' + videos.length + ' vídeo(s) encontrado(s)!</span> Escolha qual deseja usar:';

  const baseStudioUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '${siteUrl}';

  videos.forEach((vid, i) => {
    const card = document.createElement('div');
    card.style.cssText = 'background:#1e293b;border-radius:12px;padding:10px;border:1px solid #334155;';

    const isReview = vid.type === 'comentario';
    const tag = isReview
      ? '<span style="background:#0284c7;color:#fff;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;">💬 COMENTÁRIO / CLIENTE</span>'
      : '<span style="background:#ea580c;color:#fff;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;">🌟 GALERIA OFICIAL</span>';

    card.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
      tag +
      '</div>' +
      '<div style="font-weight:bold;font-size:12px;margin-bottom:8px;color:#f8fafc;">' + vid.title + '</div>' +
      '<div style="margin-bottom:8px;border-radius:8px;overflow:hidden;background:#000;">' +
        '<video src="' + vid.url + '" controls style="width:100%;max-height:160px;object-fit:contain;"></video>' +
      '</div>' +
      '<div style="display:flex;gap:6px;">' +
        '<button class="use-btn-' + i + '" style="flex:1;background:linear-gradient(135deg,#FF5722,#FF7A00);color:#fff;border:none;padding:8px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:11px;">🚀 Usar no Dark Video</button>' +
        '<button class="copy-btn-' + i + '" style="background:#334155;color:#fff;border:none;padding:8px;border-radius:8px;font-size:11px;cursor:pointer;">📋 Copiar</button>' +
      '</div>';

    listEl.appendChild(card);

    card.querySelector('.use-btn-' + i).onclick = () => {
      const targetAppUrl = baseStudioUrl + '/admin/youtube?videoUrl=' + encodeURIComponent(vid.url) +
        '&productName=' + encodeURIComponent(title) +
        '&price=' + encodeURIComponent(price) +
        '&imageUrl=' + encodeURIComponent(imageUrl) +
        '&affiliateLink=' + encodeURIComponent(url);
      window.open(targetAppUrl, '_blank');
    };

    card.querySelector('.copy-btn-' + i).onclick = (e) => {
      navigator.clipboard.writeText(vid.url);
      e.target.innerText = '✅ Copiado!';
      setTimeout(() => { e.target.innerText = '📋 Copiar'; }, 2000);
    };
  });
})();`;

  return 'javascript:' + encodeURIComponent(code.replace(/\s+/g, ' ').trim());
}
