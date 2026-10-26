import { prisma } from "../src/lib/prisma";
import { searchProductOffers, offerToProductData } from "../src/lib/shopee";
import { buildBlogContentHtml } from "../src/lib/youtubeBlogSync";
import type { YouTubeVideoInfo, MatchedProduct } from "../src/lib/youtubeBlogSync";

// Themes for each old post — mapped by their slug index
const POST_THEMES: Record<string, { title: string; keywords: string[]; emoji: string; description: string }> = {
  "top-achadinhos-transformar-vida-1": {
    title: "10 Achadinhos da Shopee para Organizar sua Casa de Vez",
    emoji: "🏠",
    description: "Organize cada cantinho da sua casa com esses itens incríveis encontrados na Shopee por um preço que você não vai acreditar.",
    keywords: ["organizador gaveta", "caixa organizadora acrílico", "suporte parede", "gancho adesivo", "porta objeto", "organizador multiuso"],
  },
  "top-achadinhos-transformar-vida-2": {
    title: "10 Achadinhos da Shopee para sua Cozinha que Valem Ouro",
    emoji: "🍳",
    description: "Utensílios e gadgets para cozinha que vão mudar sua rotina na cozinha — tudo encontrado na Shopee com ótimas avaliações.",
    keywords: ["espatula silicone", "forma antiaderente", "descascador legumes", "cortador alimentos", "frigideira ceramic", "jogo facas cozinha"],
  },
  "top-achadinhos-transformar-vida-3": {
    title: "10 Achadinhos de Tecnologia da Shopee que Todo Mundo Quer",
    emoji: "💡",
    description: "Gadgets tecnológicos incríveis a preços acessíveis — da iluminação LED a acessórios para celular que você vai amar.",
    keywords: ["fita led rgb", "suporte celular carro", "cabo usb tipo c", "carregador wireless", "hub usb", "luminaria led recarregavel"],
  },
  "top-achadinhos-transformar-vida-4": {
    title: "10 Achadinhos da Shopee para Beleza e Cuidados Pessoais",
    emoji: "💄",
    description: "Produtos de beleza e cuidados pessoais com excelente custo-benefício direto da Shopee, escolhidos pela nossa curadoria.",
    keywords: ["escova cabelo profissional", "removedor maquiagem", "hidratante corporal", "kit skincare", "mascara facial", "protetor solar facial"],
  },
  "top-achadinhos-transformar-vida-5": {
    title: "10 Achadinhos da Shopee para Academia e Vida Saudável",
    emoji: "💪",
    description: "Equipamentos e acessórios fitness que cabem no bolso e transformam qualquer lugar em academia — encontrados na Shopee.",
    keywords: ["corda pular profissional", "elastico fitness", "tapete yoga", "garrafa termica academia", "luva musculação", "rolo massagem muscular"],
  },
  "top-achadinhos-transformar-vida-6": {
    title: "10 Achadinhos da Shopee para Pets que os Bichinhos Vão Amar",
    emoji: "🐾",
    description: "Produtos para cães e gatos com ótimas avaliações na Shopee — brinquedos, acessórios e itens de cuidado para seu pet.",
    keywords: ["comedouro pet automatico", "arranhador gato", "brinquedo interativo cachorro", "coleira antipulga", "cama pet lavavel", "bebedouro fonte pet"],
  },
  "top-achadinhos-transformar-vida-7": {
    title: "10 Achadinhos da Shopee para Escritório e Home Office",
    emoji: "💻",
    description: "Monte seu home office perfeito com esses itens práticos e baratos da Shopee — mais produtividade sem gastar muito.",
    keywords: ["suporte notebook mesa", "mouse sem fio", "teclado ergonomico", "webcam full hd", "luminaria mesa usb", "organizador mesa escritorio"],
  },
  "top-achadinhos-transformar-vida-8": {
    title: "10 Achadinhos da Shopee para Viagem e Aventura",
    emoji: "✈️",
    description: "Itens indispensáveis para mochileiros e viajantes — compactos, leves e com os melhores preços na Shopee.",
    keywords: ["organizador mala roupa", "adaptador tomada universal", "travesseiro viagem inflavel", "cadeado tsa mala", "carregador portatil viagem", "necessaire impermeavel"],
  },
  "top-achadinhos-transformar-vida-9": {
    title: "10 Achadinhos da Shopee para Decorar sua Casa Gastando Pouco",
    emoji: "🎨",
    description: "Dê um up na decoração do seu lar sem estourar o orçamento — itens de decoração incríveis encontrados na Shopee.",
    keywords: ["quadro decorativo sala", "vaso planta decorativo", "espelho decorativo redondo", "luminaria abajur", "porta retrato", "plantas artificiais decorativas"],
  },
  "top-achadinhos-transformar-vida-10": {
    title: "10 Achadinhos da Shopee para Limpeza e Praticidade em Casa",
    emoji: "🧹",
    description: "Facilite a limpeza da sua casa com esses produtos incríveis da Shopee — práticos, eficientes e com preço ótimo.",
    keywords: ["mop limpeza chao", "esponja magica limpeza", "rodo telescopico", "pano microfibra", "aspirador portatil", "desentupidor pia"],
  },
};

async function searchAndPersistProducts(keywords: string[], defaultCatId: string): Promise<MatchedProduct[]> {
  const results: MatchedProduct[] = [];
  for (const keyword of keywords) {
    try {
      const res = await searchProductOffers({ keyword, limit: 1, sortType: 1 });
      if (!res.nodes?.length) continue;
      const offer = res.nodes[0];
      const payload = offerToProductData(offer);
      const itemIdStr = String(offer.itemId);
      const existing = await prisma.product.findFirst({
        where: { OR: [{ itemId: itemIdStr }, { slug: payload.slug }] },
      });
      let saved;
      if (existing) {
        saved = await prisma.product.update({
          where: { id: existing.id },
          data: {
            price: payload.price,
            affiliateLink: payload.affiliateLink,
            imageUrl: payload.imageUrl,
            sales: payload.sales,
            ratingStar: payload.ratingStar,
            discountRate: payload.discountRate,
            commissionRate: payload.commissionRate,
            priceUpdatedAt: new Date(),
          },
        });
      } else {
        saved = await prisma.product.create({
          data: { ...payload, categoryId: defaultCatId },
        });
      }
      results.push({
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
        price: saved.price ?? 0,
        imageUrl: saved.imageUrl,
        affiliateLink: saved.affiliateLink,
        ratingStar: saved.ratingStar ?? 4.7,
        sales: saved.sales ?? 200,
        discountRate: saved.discountRate ?? 10,
      });
      process.stdout.write(`  ✓ ${keyword}\n`);
    } catch (e: any) {
      process.stdout.write(`  ✗ ${keyword}: ${e.message}\n`);
    }
  }
  return results;
}

async function main() {
  console.log("=== ATUALIZANDO POSTS ANTIGOS COM PRODUTOS DA SHOPEE ===\n");

  const defaultCat = await prisma.category.findFirst({ where: { slug: "casa-cozinha" } })
    ?? await prisma.category.findFirst();
  if (!defaultCat) throw new Error("Nenhuma categoria encontrada.");

  // Get old posts (no products, no banner)
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "asc" } });
  const oldPosts = posts.filter(
    (p) => !p.content.includes("Ver Oferta na Shopee") && !p.content.includes("/go/")
  );

  console.log(`Posts antigos sem produtos: ${oldPosts.length}\n`);

  let totalUpdated = 0;

  for (const post of oldPosts) {
    const theme = POST_THEMES[post.slug];
    if (!theme) {
      console.log(`[SKIP] Sem tema definido para: ${post.slug}`);
      continue;
    }

    console.log(`\n[${totalUpdated + 1}/${oldPosts.length}] Atualizando: "${theme.title}"`);
    console.log(`  Buscando ${theme.keywords.length} produtos na Shopee...`);

    const matchedProducts = await searchAndPersistProducts(theme.keywords, defaultCat.id);

    console.log(`  Produtos encontrados: ${matchedProducts.length}`);

    // Build a fake video info just to feed buildBlogContentHtml
    const fakeVideo: YouTubeVideoInfo = {
      videoId: "",
      title: theme.title,
      thumbnail: post.imageUrl,
      channelTitle: "Curadoria Achadinhos",
    };

    const htmlContent = buildBlogContentHtml(fakeVideo, matchedProducts);
    const excerpt = `${theme.emoji} ${theme.description}`;

    await prisma.post.update({
      where: { id: post.id },
      data: {
        title: theme.title,
        content: htmlContent,
        excerpt,
        author: "Curadoria Achadinhos",
      },
    });

    console.log(`  ✅ Post atualizado com ${matchedProducts.length} produtos!`);
    totalUpdated++;
  }

  console.log(`\n=== CONCLUÍDO: ${totalUpdated} posts atualizados! ===`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
