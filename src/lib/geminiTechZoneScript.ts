/**
 * 🎬 GERADOR DE ROTEIROS INTELIGENTES ESTILO TECHZONE COM GOOGLE GEMINI AI
 * Analisa a lista completa de produtos da Shopee, identifica os mais vendidos/destaques
 * e cria uma narrativa eletrizante, dinâmica e altamente personalizada para cada item.
 */

export interface TechZoneScriptItem {
  number: number;
  productName: string;
  shortName: string;
  hook: string;
  narration: string;
  priceSpoken: string;
  salesHighlight: string;
  isChampion: boolean;
  isBestValue: boolean;
}

export interface TechZoneScriptResponse {
  introNarration: string;
  championProductIndex: number;
  items: TechZoneScriptItem[];
  outroNarration: string;
  formattedFullScript: string;
}

export async function generateTechZoneScriptWithGemini(params: {
  products: Array<{
    name: string;
    price: number | null;
    originalPrice?: number | null;
    sales?: number | null;
    ratingStar?: number | null;
    discountRate?: number | null;
    slug?: string;
  }>;
  theme?: string;
  siteUrl?: string;
  apiKey?: string;
}): Promise<TechZoneScriptResponse> {
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY || "";
  const products = params.products;
  const theme = params.theme || "Achadinhos Incríveis da Shopee";
  const siteUrl = params.siteUrl || "https://achadinhosdodia.com.br";

  // Identificação prévia dos dados para guiar o Gemini
  const sortedBySales = [...products].sort((a, b) => (b.sales || 0) - (a.sales || 0));
  const topSalesItem = sortedBySales[0];

  const sortedByPrice = [...products]
    .filter((p) => (p.price || 0) > 0)
    .sort((a, b) => (a.price || 0) - (b.price || 0));
  const cheapestItem = sortedByPrice[0];

  const minPriceFormatted = cheapestItem?.price
    ? `R$ ${cheapestItem.price.toFixed(2).replace(".", ",")}`
    : "menos de R$ 20";

  const productsSummary = products.map((p, idx) => ({
    pos: idx + 1,
    name: p.name,
    price: p.price ? `R$ ${p.price.toFixed(2).replace(".", ",")}` : "Promocional",
    sales: p.sales ? `${p.sales} vendas` : "Alta procura",
    rating: p.ratingStar ? `${p.ratingStar.toFixed(1)} estrelas` : "Muito bem avaliado",
    discount: p.discountRate ? `${p.discountRate}% OFF` : null,
  }));

  const systemPrompt = `Você é o roteirista sênior do canal TECHZONE (estilo TechZone Brasil / TechZone Gadgets).
Sua marca registrada é:
- Tom ENERGÉTICO, DINÂMICO, CURIOSO e BEM HUMORADO.
- Você NÃO lê listas mecânicas nem usa frases engessadas de robô.
- Você IDENTIFICA o que cada produto realmente faz na vida real (o que resolve, por que as pessoas estão comprando aos milhares na Shopee).
- Você CRIA GANCHOS DE RETENÇÃO: no início do vídeo, você avisa a audiência que tem um produto campeão de vendas absoluto que eles precisam ver.
- Para cada produto: você explica o funcionamento prático como se estivesse mostrando na mão, menciona as vendas impressionantes na Shopee e o preço com naturalidade.

ANALISE OS ${products.length} PRODUTOS ABAIXO:
${JSON.stringify(productsSummary, null, 2)}

Destaque principal por vendas comprovadas na Shopee: "${topSalesItem?.name || products[0]?.name}".
Menor preço da lista: ${minPriceFormatted}.

INSTRUÇÕES ESTRITAS:
1. "intro": Uma abertura eletrizante de 10 a 15 segundos estilo TechZone prendendo o público ("Sejam bem-vindos! Hoje garimpamos na Shopee os gadgets e utilidades que estão explodindo em vendas... e o item número X sozinho já vendeu dezenas de milhares de unidades!").
2. "items": Para cada um dos ${products.length} produtos, gere:
   - "pos": número da posição (1 a ${products.length}).
   - "shortName": nome comercial curto e sonoro (3 a 5 palavras).
   - "hook": frase de transição/impacto rápida puxando a atenção para ele.
   - "narration": texto completo da fala daquele item (entre 35 e 60 palavras), falado com naturalidade, citando para que serve o produto, como funciona e por que é genial, terminando indicando o link na descrição.
   - "isChampion": true apenas para o produto campeão que teve mais destaque/vendas.
   - "isBestValue": true apenas para a opção mais barata ou custo-benefício.
3. "outro": Encerramento rápido e animado com CTA para se inscrever no canal e conferir os links oficiais na descrição.

Retorne EXCLUSIVAMENTE um JSON válido com a seguinte estrutura:
{
  "intro": "...",
  "championPos": ${products.indexOf(topSalesItem) + 1 || 1},
  "items": [
    {
      "pos": 1,
      "shortName": "...",
      "hook": "...",
      "narration": "...",
      "isChampion": false,
      "isBestValue": false
    }
  ],
  "outro": "..."
}`;

  if (apiKey) {
    const models = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-1.5-flash"];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.85,
            },
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJson) continue;

        const parsed = JSON.parse(rawJson);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          return buildFormattedScript({
            theme,
            siteUrl,
            products,
            intro: parsed.intro,
            championPos: parsed.championPos || 1,
            items: parsed.items,
            outro: parsed.outro,
          });
        }
      } catch (err: any) {
        console.warn(`[TechZone Gemini] Falha no modelo ${model}:`, err.message);
      }
    }
  }

  // Fallback inteligente caso Gemini esteja sem cota
  return buildSmartFallbackScript({ theme, siteUrl, products, topSalesItem, minPriceFormatted });
}

function buildFormattedScript({
  theme,
  siteUrl,
  products,
  intro,
  championPos,
  items,
  outro,
}: {
  theme: string;
  siteUrl: string;
  products: any[];
  intro: string;
  championPos: number;
  items: any[];
  outro: string;
}): TechZoneScriptResponse {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`🎬 ROTEIRO DINÂMICO TECHZONE — ${theme.toUpperCase()}`);
  lines.push("Narrativa Inteligente por Google Gemini AI | Ritmo TechZone Brasil");
  lines.push("═══════════════════════════════════════════════════════════════\n");

  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("🔥 ABERTURA DINÂMICA TECHZONE (Gancho de Retenção)");
  lines.push("───────────────────────────────────────────────────────────────\n");
  lines.push("[NARRAÇÃO DO APRESENTADOR]");
  lines.push(intro + "\n");
  lines.push("[EDIÇÃO VISUAL]");
  lines.push("- Teaser rápido de 2s mostrando o produto campeão em funcionamento.");
  lines.push("- Trilha moderna estilo TechZone entrando no ritmo da fala.\n");

  const formattedItems: TechZoneScriptItem[] = [];

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const aiItem = items.find((it) => it.pos === i + 1) || items[i] || {};
    const pos = i + 1;
    const isChampion = aiItem.isChampion || pos === championPos;
    const isBestValue = Boolean(aiItem.isBestValue);
    const shortName = aiItem.shortName || prod.name.split(" ").slice(0, 4).join(" ");
    const hook = aiItem.hook || `Dá uma olhada nesse próximo achadinho: o ${shortName}!`;
    const narration = aiItem.narration || `${hook} Esse item se destaca pela utilidade e acabamento. O link oficial é o número ${pos} na descrição.`;
    const priceSpoken = prod.price ? `R$ ${prod.price.toFixed(2).replace(".", ",")}` : "preço promocional";
    const salesHighlight = prod.sales ? `Mais de ${prod.sales} vendas na Shopee` : "Sucesso em vendas";

    formattedItems.push({
      number: pos,
      productName: prod.name,
      shortName,
      hook,
      narration,
      priceSpoken,
      salesHighlight,
      isChampion,
      isBestValue,
    });

    lines.push("───────────────────────────────────────────────────────────────");
    lines.push(
      `📦 ITEM ${pos} ${isChampion ? "👑 [CAMPEÃO DE VENDAS SHOPEE]" : isBestValue ? "💰 [MAIOR CUSTO-BENEFÍCIO]" : "✨ [ACHADINHO]"} — ${shortName.toUpperCase()}`
    );
    lines.push("───────────────────────────────────────────────────────────────\n");
    lines.push(`[NARRAÇÃO DA CENA]`);
    lines.push(narration + "\n");
    lines.push(`[DETALHES SHOPEE]`);
    lines.push(`- Preço confirmado: ${priceSpoken}`);
    lines.push(`- Destaque: ${salesHighlight}`);
    lines.push(`- Link: Número ${pos} na descrição oficial.\n`);
  }

  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("🚀 ENCERRAMENTO E CHAMADA PARA AÇÃO (CTA)");
  lines.push("───────────────────────────────────────────────────────────────\n");
  lines.push("[NARRAÇÃO DO APRESENTADOR]");
  lines.push(outro + "\n");
  lines.push("[TELA FINAL]");
  lines.push(`- Links numerados de 1 a ${products.length} no topo da descrição.`);
  lines.push(`- Acesso direto pelo site oficial: ${siteUrl.replace("https://", "")}\n`);

  return {
    introNarration: intro,
    championProductIndex: championPos - 1,
    items: formattedItems,
    outroNarration: outro,
    formattedFullScript: lines.join("\n"),
  };
}

function buildSmartFallbackScript({
  theme,
  siteUrl,
  products,
  topSalesItem,
  minPriceFormatted,
}: {
  theme: string;
  siteUrl: string;
  products: any[];
  topSalesItem: any;
  minPriceFormatted: string;
}): TechZoneScriptResponse {
  const champPos = products.indexOf(topSalesItem) + 1 || 1;
  const champName = topSalesItem?.name ? topSalesItem.name.split(" ").slice(0, 4).join(" ") : "produto campeão";
  const champSales = topSalesItem?.sales ? `mais de ${topSalesItem.sales} pessoas que já garantiram` : "milhares de pedidos";

  const intro = `E aí pessoal, sejam muito bem-vindos! Hoje garimpamos na Shopee os achadinhos mais incríveis e úteis que estão bombando de verdade. E tem de tudo: opções a partir de apenas ${minPriceFormatted}, até o item número ${champPos}, o famoso ${champName}, com ${champSales}! Segura aí porque a lista de hoje vale muito a pena. Bora conferir!`;

  const outro = `E aí, qual desses achadinhos você levaria pra casa hoje? Comenta aqui embaixo! Não esquece de deixar o like e se inscrever no canal para não perder os próximos achadinhos. Todos os links oficiais estão organizados na descrição em ordem. Até a próxima!`;

  const items = products.map((p, i) => {
    const pos = i + 1;
    const short = p.name.split(" ").slice(0, 4).join(" ");
    const isChamp = pos === champPos;
    const priceStr = p.price ? `R$ ${p.price.toFixed(2).replace(".", ",")}` : "preço especial";
    const salesStr = p.sales ? `mais de ${p.sales} vendas` : "alta procura";

    return {
      pos,
      shortName: short,
      hook: isChamp ? `E agora chegamos nele, o grande campeão da lista!` : `Dá uma olhada nessa solução incrível: o ${short}.`,
      narration: isChamp
        ? `Chegamos ao grande destaque da Shopee: o ${short}! Esse produto viralizou por entregar uma praticidade absurda no dia a dia, acumulando nota máxima e ${salesStr}. Ele está saindo por apenas ${priceStr}. O link com desconto tá no número ${pos} da descrição!`
        : `O próximo item da nossa lista é o ${short}. Ele resolve um problema super comum na rotina com muita facilidade. Na Shopee ele já conta com ${salesStr} e tá custando só ${priceStr}. O link oficial com todas as cores e opções é o número ${pos} na descrição.`,
      isChampion: isChamp,
      isBestValue: false,
    };
  });

  return buildFormattedScript({ theme, siteUrl, products, intro, championPos: champPos, items, outro });
}
