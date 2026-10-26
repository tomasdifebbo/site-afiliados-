import { prisma } from "../src/lib/prisma";

async function removeOldYoutubeIframes() {
  console.log("=== REMOVENDO IFRAMES DO YOUTUBE DE POSTS ANTIGOS ===\n");

  const posts = await prisma.post.findMany({
    select: { id: true, title: true, slug: true, content: true, imageUrl: true }
  });

  console.log(`Total de posts no banco: ${posts.length}`);

  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    if (!post.content.includes("youtube-nocookie.com") && !post.content.includes("youtube.com/embed")) {
      skipped++;
      continue;
    }

    console.log(`\n[Removendo iframe] Post: "${post.title.slice(0, 60)}"`);

    // Extract the video ID from the iframe src
    const videoIdMatch = post.content.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch?.[1];

    // Generate a replacement hero banner using the thumbnail
    const thumbnailUrl = videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : post.imageUrl;

    // Build a clean hero banner (no video, uses thumbnail + branded overlay)
    const heroReplacement = `
  <!-- Hero Banner — imagem de capa original (sem iframe) -->
  <div style="
    background: linear-gradient(135deg, #FF5722 0%, #FF7A00 55%, #FFA726 100%);
    border-radius: 24px;
    overflow: hidden;
    margin-bottom: 2.5rem;
    box-shadow: 0 16px 48px rgba(255,87,34,0.28);
    position: relative;
  ">
    <img
      src="${thumbnailUrl}"
      alt="${post.title}"
      style="width: 100%; max-height: 420px; object-fit: cover; opacity: 0.22; display: block;"
      loading="lazy"
    />
    <div style="
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem;
      text-align: center;
      gap: 1.25rem;
    ">
      <span style="background: rgba(255,255,255,0.2); color: #fff; font-size: 0.8rem; font-weight: 800; padding: 5px 16px; border-radius: 20px; letter-spacing: 0.06em; text-transform: uppercase;">
        🔥 Curadoria Exclusiva Achadinhos do Dia
      </span>
      <h1 style="
        margin: 0;
        font-size: clamp(1.5rem, 4vw, 2.5rem);
        font-weight: 900;
        color: #ffffff;
        line-height: 1.2;
        text-shadow: 0 2px 14px rgba(0,0,0,0.3);
        max-width: 640px;
      ">
        ${post.title}
      </h1>
      <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 1rem; font-weight: 500; max-width: 480px;">
        Nossa equipe localizou todos os produtos na <strong>Shopee Brasil</strong> com preços verificados e links seguros.
      </p>
      <span style="background: #fff; color: #FF5722; font-weight: 800; font-size: 0.9rem; padding: 8px 22px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">
        Veja os preços abaixo 👇
      </span>
    </div>
  </div>`;

    // Replace the entire iframe block with the new hero
    let newContent = post.content
      // Remove iframe wrapper div + iframe tag
      .replace(
        /<!-- Video Player Embed -->[\s\S]*?<\/div>/,
        heroReplacement
      )
      // Also update the intro text if it mentions "Confira acima o vídeo"
      .replace(
        /Confira acima o vídeo completo de[\s\S]*?bem avaliados\./,
        "Nossa equipe garimpou e localizou todos os produtos na <strong>Shopee Brasil</strong> com os melhores preços, vendedores certificados e avaliações reais. Clique em qualquer item abaixo para ver a oferta diretamente na plataforma."
      )
      // Update section title
      .replace(
        "🛍️ Produtos &amp; Achadinhos do Vídeo",
        "🛍️ Achadinhos Localizados na Shopee"
      )
      .replace(
        "🛍️ Produtos & Achadinhos do Vídeo",
        "🛍️ Achadinhos Localizados na Shopee"
      );

    // If iframe block wasn't cleanly matched, do a broader strip
    if (newContent.includes("youtube-nocookie.com") || newContent.includes("youtube.com/embed")) {
      newContent = newContent
        .replace(/<div[^>]*>[\s\S]*?<iframe[\s\S]*?<\/iframe>[\s\S]*?<\/div>/gi, heroReplacement)
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
    }

    await prisma.post.update({
      where: { id: post.id },
      data: { content: newContent }
    });

    console.log(`  ✓ Iframe removido e substituído por banner próprio.`);
    updated++;
  }

  console.log(`\n=== CONCLUÍDO ===`);
  console.log(`Posts atualizados: ${updated}`);
  console.log(`Posts sem iframe (ignorados): ${skipped}`);
}

removeOldYoutubeIframes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
