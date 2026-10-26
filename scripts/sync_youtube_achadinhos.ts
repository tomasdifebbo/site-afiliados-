import { syncYouTubeAchadinhosToBlog } from "../src/lib/youtubeBlogSync";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=================================================");
  console.log("SINCRONIZADOR DE VÍDEOS DO YOUTUBE & ACHADINHOS SHOPEE");
  console.log("=================================================");

  const query = process.argv[2] || "achadinhos da shopee";
  const limit = parseInt(process.argv[3] || "3", 10);

  console.log(`Buscando no YouTube por: "${query}" (Limite: ${limit} vídeos)...`);

  const result = await syncYouTubeAchadinhosToBlog({
    query,
    maxVideos: limit,
    author: "Curadoria Achadinhos",
  });

  console.log("\nResultado:", result.message);
  console.log("Total de posts:", result.postsCreated);
  console.log("Total de produtos da Shopee encontrados:", result.totalMatchedProducts);

  if (result.posts && result.posts.length > 0) {
    console.log("\nArtigos no Blog criados:");
    result.posts.forEach((p, idx) => {
      console.log(`${idx + 1}. [${p.status.toUpperCase()}] ${p.title}`);
      console.log(`   Slug: /blog/${p.slug}`);
      console.log(`   Achadinhos Shopee no artigo: ${p.productCount}`);
    });
  }

  const totalPostsInDb = await prisma.post.count();
  console.log(`\nTotal atual de posts no Blog do site: ${totalPostsInDb}`);
}

main()
  .catch((e) => {
    console.error("Erro fatal na sincronização:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
