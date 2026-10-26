import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { identifyProductsFromYouTubeVideo } from "@/lib/youtubeBlogSync";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, categoryId, youtubeUrl, flashDeals, siteUrl = "https://achadinhosdodia.com.br" } = body;

    let title = "";
    let products: any[] = [];
    let theme = "";

    if (youtubeUrl) {
      const ytData = await identifyProductsFromYouTubeVideo(youtubeUrl);
      title = ytData.title.startsWith("10") ? ytData.title : `10 Achadinhos da Shopee — ${ytData.title.slice(0, 50)}`;
      theme = ytData.title;
      products = ytData.products;
    } else if (flashDeals) {
      title = "10 Super Ofertas Relâmpago da Shopee de Hoje com os Maiores Descontos";
      theme = "Ofertas Relâmpago Shopee";
      products = await prisma.product.findMany({
        where: { price: { gt: 0 }, discountRate: { gte: 15 } },
        orderBy: [
          { discountRate: "desc" },
          { sales: "desc" },
          { priceUpdatedAt: "desc" },
        ],
        take: 10,
      });
      if (products.length < 5) {
        products = await prisma.product.findMany({
          where: { price: { gt: 0 } },
          orderBy: [{ sales: "desc" }],
          take: 10,
        });
      }
    } else if (postId) {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
      title = post.title;
      const slugMatches = [...post.content.matchAll(/href="\/go\/([^"?]+)/g)];
      const slugs = [...new Set(slugMatches.map((m) => m[1]))];
      if (slugs.length > 0) {
        products = await prisma.product.findMany({ where: { slug: { in: slugs } }, take: 12 });
      }
    } else if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
      theme = category.name;
      title = `10 Achadinhos da Shopee — ${category.name}`;
      products = await prisma.product.findMany({
        where: { categoryId, ratingStar: { gte: 4 }, price: { gt: 0 } },
        orderBy: { sales: "desc" },
        take: 10,
      });
    } else {
      title = "10 Achadinhos Incríveis da Shopee que Merecem Entrar no seu Radar";
      products = await prisma.product.findMany({
        where: { ratingStar: { gte: 4 }, price: { gt: 0 } },
        orderBy: { sales: "desc" },
        take: 10,
      });
    }

    if (products.length === 0) {
      return NextResponse.json({ error: "Nenhum produto encontrado." }, { status: 404 });
    }

    const fullScript = generateHumanScript({ title, products, siteUrl, theme });
    const youtubeDescription = generateDescription({ title, products, siteUrl });
    const thumbnailSuggestion = generateThumbnailGuide(products);
    const tags = generateTags(products, theme);

    return NextResponse.json({
      title,
      productCount: products.length,
      fullScript,
      youtubeDescription,
      thumbnailSuggestion,
      tags,
      products: products.map((p) => ({
        name: p.name,
        price: p.price,
        ratingStar: p.ratingStar,
        sales: p.sales,
        discountRate: p.discountRate,
        imageUrl: p.imageUrl,
        link: `${siteUrl}/go/${p.slug}?origin=youtube_dark`,
      })),
    });
  } catch (err: any) {
    console.error("Erro ao gerar roteiro:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(price: number | null) {
  if (!price) return "preço interessante";
  return `R$ ${price.toFixed(2).replace(".", ",")}`;
}

function fmtSales(sales: number | null) {
  if (!sales) return "boas vendas";
  if (sales >= 1000) return `mais de ${Math.floor(sales / 1000) * 1000} vendas`;
  return `mais de ${sales} vendas`;
}

// Unique, contextual product intros — Human & Conversational (Prompt Mestre)
const SITUATIONAL_HOOKS = [
  (name: string) => `Pra começar, sabe aquela praticidade que todo mundo procura na rotina? É exatamente o que você encontra no ${shortName(name)}.`,
  (name: string) => `O segundo achadinho resolve um problema comum de quem gosta de manter a casa em ordem: o ${shortName(name)}.`,
  (name: string) => `Agora, se você preza por conforto sem precisar gastar muito, dá uma olhada no ${shortName(name)}.`,
  (name: string) => `Para quem quer economizar tempo nas tarefas do dia a dia, essa próxima descoberta é bem interessante: ${shortName(name)}.`,
  (name: string) => `Chegamos ao quinto item, e esse aqui chama atenção pela versatilidade: é o ${shortName(name)}.`,
  (name: string) => `Mudando um pouco o ambiente, esse acessório ajuda a aproveitar muito melhor o espaço: ${shortName(name)}.`,
  (name: string) => `Para quem não abre mão de funcionalidade e bom acabamento, o número 7 é o ${shortName(name)}.`,
  (name: string) => `Se a sua prioridade é custo-benefício com utilidade real, veja o que achamos: ${shortName(name)}.`,
  (name: string) => `Quase no final da seleção, esse penúltimo achadinho se destaca por um detalhe de design bem pensado: ${shortName(name)}.`,
  (name: string) => `E para fechar a nossa seleção de hoje com uma descoberta muito prática, temos o ${shortName(name)}.`,
  (name: string) => `Como opção extra que vale muito a pena conhecer: ${shortName(name)}.`,
  (name: string) => `Mais uma alternativa bem avaliada para complementar a lista: ${shortName(name)}.`,
];

// Contextual transitions between products — Prompt Mestre (Fluidez & Conexão)
function buildTransition(current: any, next: any | null, index: number): string {
  if (!next) return ""; // Last product, no transition needed

  const curPrice = current.price ?? 0;
  const nextPrice = next.price ?? 0;
  const cheaper = nextPrice < curPrice;
  const expensive = nextPrice > curPrice;

  const transitions = [
    `Conectando com essa ideia de praticidade, o próximo achadinho tem uma proposta diferente para o dia a dia.`,
    `Agora, saindo um pouco desse nicho e indo para outra parte da casa, veja essa nova descoberta.`,
    `E se a sua meta for ${cheaper ? "economizar ainda mais" : "um acabamento ainda mais elaborado"}, a próxima opção se encaixa perfeitamente.`,
    `Seguindo essa mesma linha de utilidade, o próximo item resolve uma situação bem comum na rotina.`,
    `Para quem gosta de alternativas inteligentes, o que vem a seguir traz um visual bem interessante.`,
    `Avançando na seleção, o próximo achadinho aposta em simplicidade e facilidade de uso.`,
    `E o próximo modelo traz um detalhe funcional que faz toda a diferença na hora de usar.`,
    `Mantendo o foco em soluções práticas, olha o que separamos na sequência.`,
  ];

  return transitions[index % transitions.length];
}

function shortName(name: string) {
  return name.split(" ").slice(0, 5).join(" ");
}

function getBenefit(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tênis") || n.includes("tenis")) return "Uma opção para quem busca praticidade e um visual casual no dia a dia.";
  if (n.includes("sandália") || n.includes("sandalia")) return "Modelo que pode combinar tanto com looks mais simples quanto com produções de verão.";
  if (n.includes("chinelo") || n.includes("babuche")) return "Para os momentos mais tranquilos, onde o conforto faz toda a diferença.";
  if (n.includes("organiz")) return "Para quem quer deixar o espaço mais arrumado sem complicação.";
  if (n.includes("cozinha") || n.includes("frigidei") || n.includes("panela")) return "Pode ser uma adição prática na rotina da cozinha.";
  if (n.includes("led") || n.includes("lumin")) return "A instalação costuma ser simples e o efeito visual muda bastante o ambiente.";
  if (n.includes("cabelo") || n.includes("pele") || n.includes("maquiagem")) return "Para quem quer cuidar da beleza em casa sem gastar muito.";
  if (n.includes("academia") || n.includes("fitness")) return "Uma alternativa para quem quer se mexer sem depender de equipamentos grandes.";
  if (n.includes("pet") || n.includes("gato") || n.includes("cachorro")) return "Para quem tem pet em casa, pode ser uma boa adição à rotina do bichinho.";
  if (n.includes("viagem") || n.includes("mala")) return "Compacto e prático — pensado para facilitar na hora de organizar a mala.";
  if (n.includes("decora")) return "Um toque a mais na decoração do ambiente, sem precisar reformar nada.";
  if (n.includes("limpeza") || n.includes("limpa")) return "Pode tornar a limpeza um pouco mais rápida no dia a dia.";
  return "Vale a pena conferir as avaliações e ver se atende ao que você precisa.";
}

function getCheckAdvice(index: number): string {
  const tips = [
    "Antes de comprar, confira a tabela de tamanhos e as avaliações com foto dos compradores.",
    "Vale olhar os comentários mais recentes para ter uma ideia melhor do produto na prática.",
    "Uma dica: verifique as avaliações com fotos para ter uma referência mais real do produto.",
    "Confira as especificações e os comentários antes de finalizar a compra.",
    "Lembre-se de checar o material e o tamanho nas avaliações dos compradores.",
    "Vale a pena comparar com outros anúncios do mesmo produto antes de decidir.",
  ];
  return tips[index % tips.length];
}

// ─── Script builder ─────────────────────────────────────────────────────────

function generateHumanScript({ title, products, siteUrl, theme }: {
  title: string;
  products: any[];
  siteUrl: string;
  theme?: string;
}) {
  const cheapest = [...products].sort((a, b) => (a.price ?? 99) - (b.price ?? 99))[0];
  const minPrice = cheapest?.price ? fmt(cheapest.price) : "menos de R$ 30";
  const highlightIndex = Math.ceil(products.length / 2); // produto do meio como destaque

  const lines: string[] = [];

  // ── HEADER ──
  lines.push(`═══════════════════════════════════════════════`);
  lines.push(`🎬 ROTEIRO PROFISSIONAL — ${title.toUpperCase()}`);
  lines.push(``);
  lines.push(`Estilo: Storytelling Comercial & Humanizado | Alta Retenção | Conversa Natural`);
  lines.push(`═══════════════════════════════════════════════`);
  lines.push(``);

  // ── ABERTURA (0 a 7 segundos) ──
  lines.push(`─────────────────────────────────────────`);
  lines.push(`🎣 ABERTURA DINÂMICA (0 a 7s)`);
  lines.push(`─────────────────────────────────────────`);
  lines.push(``);
  lines.push(`[NARRAÇÃO — TOM NATURAL E CONVERSADO]`);
  lines.push(``);

  const themeLabel = theme || "a sua casa";
  lines.push(`Separei 10 achadinhos para ${themeLabel} que podem facilitar bastante o seu dia a dia — e tem coisa aqui a partir de ${minPrice}!`);
  lines.push(``);
  lines.push(`Dá uma olhada no número ${highlightIndex}, porque ele é muito versátil e resolve um problema que quase todo mundo tem.`);
  lines.push(``);
  lines.push(`Vamos conferir?`);
  lines.push(``);
  lines.push(`[EDIÇÃO DE ABERTURA]`);
  lines.push(`- Teaser dinâmico de 1.5s com 3 dos produtos em destaque.`);
  lines.push(`- Trilha instrumental envolvente entrando suavemente sob a narração.`);
  lines.push(`- Nome do canal integrado de forma limpa.`);
  lines.push(`- Transição fluida para o primeiro produto.`);
  lines.push(``);

  // ── PRODUTOS (18 a 24 segundos por item) ──
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const num = i + 1;
    const next = products[i + 1] || null;
    const isHighlight = num === highlightIndex;
    const price = fmt(p.price);
    const sales = fmtSales(p.sales);
    const rating = p.ratingStar ? `${p.ratingStar.toFixed(1)} estrelas` : "avaliação positiva";
    const discount = p.discountRate ? `${p.discountRate}%` : null;
    const hook = SITUATIONAL_HOOKS[Math.min(i, SITUATIONAL_HOOKS.length - 1)](p.name);
    const benefit = getBenefit(p.name);
    const checkTip = getCheckAdvice(i);
    const timeStart = `${7 + i * 20}s`;
    const timeEnd = `${7 + (i + 1) * 20}s`;
    const emoji = getEmoji(p.name);

    lines.push(`─────────────────────────────────────────`);
    lines.push(`${emoji} PRODUTO ${num}${isHighlight ? " ⭐ DESTAQUE VERSÁTIL" : ""} — ${p.name.toUpperCase().slice(0, 50)} (${timeStart} — ${timeEnd})`);
    lines.push(`─────────────────────────────────────────`);
    lines.push(``);
    lines.push(`[COMPOSIÇÃO VISUAL — PRODUTO EM DESTAQUE]`);
    lines.push(`- Imagem nítida com aproximação suave (zoom contínuo e sutil).`);
    lines.push(`- Tag do benefício prático exibida na tela.`);
    if (isHighlight) lines.push(`- Destaque visual suave para indicar versatilidade.`);
    lines.push(``);
    lines.push(`[NARRAÇÃO — 18 a 24s]`);
    lines.push(``);
    lines.push(hook);
    lines.push(``);
    lines.push(`${benefit}`);
    lines.push(``);
    lines.push(`Na Shopee, ele conta com nota ${rating} e ${sales} registradas.`);
    lines.push(``);
    lines.push(`O preço confirmado no anúncio é de ${price}${discount ? `, com desconto anunciado de ${discount}` : ""}.`);
    lines.push(``);
    lines.push(`${checkTip}`);
    lines.push(``);
    lines.push(`Para ver todas as fotos e detalhes, o link é o número ${num} na descrição.`);
    lines.push(``);
    lines.push(`[EDIÇÃO]`);
    lines.push(`- Card de preço destacado: ${price}${discount ? ` (${discount} OFF)` : ""}.`);
    lines.push(`- Movimento suave de câmera destacando os detalhes.`);
    lines.push(``);

    const transition = buildTransition(p, next, i);
    if (transition) {
      lines.push(`[TRANSIÇÃO SUAVE]`);
      lines.push(``);
      lines.push(transition);
      lines.push(``);
    }
  }

  // ── ENCERRAMENTO (~8 segundos) ──
  lines.push(`─────────────────────────────────────────`);
  lines.push(`🌐 ENCERRAMENTO NATURAL (~8s)`);
  lines.push(`─────────────────────────────────────────`);
  lines.push(``);
  lines.push(`[NARRAÇÃO — TOM AMIGÁVEL E ESPONTÂNEO]`);
  lines.push(``);
  lines.push(`E aí, qual desses achadinhos você levaria para casa? Me conta nos comentários!`);
  lines.push(``);
  lines.push(`Se curtiu a seleção, se inscreve no canal porque sempre tem novas descobertas úteis por aqui.`);
  lines.push(``);
  lines.push(`Todos os links oficiais estão organizados aqui embaixo na descrição. Até a próxima!`);
  lines.push(``);
  lines.push(`[EDIÇÃO FINAL]`);
  lines.push(`- Exibição sutil do site ${siteUrl.replace("https://", "")}`);
  lines.push(`- Transição suave com diminuição gradual do volume da trilha musical (fade-out).`);
  lines.push(``);
  lines.push(`[EDIÇÃO FINAL — TRANSIÇÃO SUAVE]`);
  lines.push(`- Manter a imagem do último produto por dois segundos.`);
  lines.push(`- Fazer zoom-out lento.`);
  lines.push(`- Dissolver para tela final com o endereço do site.`);
  lines.push(`- Mostrar botão de inscrição e vídeo recomendado.`);
  lines.push(`- Trilha com fade-out gradual — evitar corte seco.`);

  return lines.join("\n");
}

function getEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tênis") || n.includes("tenis")) return "👟";
  if (n.includes("sandália") || n.includes("sandalia")) return "👡";
  if (n.includes("chinelo") || n.includes("babuche")) return "🩴";
  if (n.includes("organiz")) return "🗂️";
  if (n.includes("cozinha") || n.includes("frigidei") || n.includes("panela")) return "🍳";
  if (n.includes("led") || n.includes("lumin")) return "💡";
  if (n.includes("cabelo")) return "💇";
  if (n.includes("academia") || n.includes("fitness")) return "💪";
  if (n.includes("pet") || n.includes("gato") || n.includes("cachorro")) return "🐾";
  if (n.includes("viagem")) return "✈️";
  if (n.includes("decora")) return "🎨";
  if (n.includes("limpeza")) return "🧹";
  return "🛍️";
}

// ─── YouTube Description ─────────────────────────────────────────────────────

function generateDescription({ title, products, siteUrl }: {
  title: string;
  products: any[];
  siteUrl: string;
}) {
  return [
    `${title}`,
    ``,
    `Uma seleção com ${products.length} produtos encontrados na Shopee, com boas avaliações e bastante vendidos. Os links levam direto para os anúncios — confira os detalhes, as fotos dos compradores e decida com calma.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 Links dos produtos (em ordem):`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    ...products.map((p, i) => `${i + 1}. ${p.name.slice(0, 55)} → ${siteUrl}/go/${p.slug}?origin=yt_desc`),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🌐 Site com mais seleções:`,
    `👉 ${siteUrl}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `ℹ️ Este canal é um agregador de links de afiliado. Recebemos comissão por compras realizadas pelos nossos links, sem custo adicional para você. Os preços podem variar a qualquer momento — consulte sempre o anúncio oficial antes de comprar.`,
    ``,
    `#achadinhos #shopee #achadinhosdashopee #comprasonline #dicasdecompra`,
  ].join("\n");
}

// ─── Thumbnail Guide ─────────────────────────────────────────────────────────

function generateThumbnailGuide(products: any[]) {
  const top3 = products.slice(0, 3).map((p) => p.name.split(" ").slice(0, 4).join(" "));
  const cheapest = [...products].sort((a, b) => (a.price ?? 99) - (b.price ?? 99))[0];

  return [
    `🖼️ GUIA DE THUMBNAIL — CANVA`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `FUNDO:`,
    `• Opção A: Laranja forte (#FF5722) — chamativo e direto`,
    `• Opção B: Preto com elementos coloridos — aspecto premium`,
    ``,
    `TEXTO PRINCIPAL (lado esquerdo):`,
    `• "TOP 10" em fonte grande e bold`,
    `• Subtítulo: "da Shopee" menor, logo abaixo`,
    `• Fonte sugerida: Bebas Neue ou Anton (gratuitas no Canva)`,
    ``,
    `IMAGENS (lado direito — colagem):`,
    ...top3.map((n, i) => `  ${i + 1}. ${n}`),
    ``,
    `DESTAQUE DE PREÇO:`,
    cheapest?.price ? `• Badge com "a partir de ${fmt(cheapest.price)}" no canto inferior` : `• Badge com "preços imperdíveis"`,
    ``,
    `ELEMENTOS OPCIONAIS:`,
    `• Emoji 🔥 ou 😱 no canto superior direito`,
    `• Seta apontando para os produtos`,
    ``,
    `DICA: Use contraste alto. Fundo escuro + texto claro, ou fundo laranja + texto branco.`,
  ].join("\n");
}

// ─── Tags ────────────────────────────────────────────────────────────────────

function generateTags(products: any[], theme: string): string[] {
  const base = [
    "achadinhos", "shopee", "achadinhos da shopee", "produtos shopee",
    "compras online", "ofertas shopee", "melhores compras", "produtos baratos",
    "achados shopee", "dicas de compra", "afiliados shopee",
  ];
  if (theme) {
    base.push(theme.toLowerCase());
    base.push(`achadinhos ${theme.toLowerCase()}`);
    base.push(`shopee ${theme.toLowerCase()}`);
  }
  const productTags = products
    .slice(0, 5)
    .map((p) => p.name.split(" ").slice(0, 3).join(" ").toLowerCase());

  return [...new Set([...base, ...productTags])].slice(0, 20);
}
