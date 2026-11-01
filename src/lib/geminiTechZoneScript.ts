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

  // Identificação inteligente do produto destaque para guiar o Gemini
  // Prioriza produtos com valor percebido real (evita escolher gancho plástico de R$ 0,99 como herói do vídeo)
  const candidateChampions = [...products].filter((p) => (p.price || 0) >= 12 && !/gancho|cola|adesivo/i.test(p.name));
  const championPool = candidateChampions.length > 0 ? candidateChampions : products;
  const topSalesItem = [...championPool].sort((a, b) => (b.sales || 0) - (a.sales || 0))[0] || products[0];

  const sortedByPrice = [...products]
    .filter((p) => (p.price || 0) > 0)
    .sort((a, b) => (a.price || 0) - (b.price || 0));
  const cheapestItem = sortedByPrice[0];

  const minPriceFormatted = cheapestItem?.price
    ? `R$ ${cheapestItem.price.toFixed(2).replace(".", ",")}`
    : "menos de R$ 15";

  const productsSummary = products.map((p, idx) => ({
    pos: idx + 1,
    name: p.name,
    price: p.price ? `R$ ${p.price.toFixed(2).replace(".", ",")}` : "Promocional",
    sales: p.sales ? `${p.sales} vendas` : "Alta procura",
    rating: p.ratingStar ? `${p.ratingStar.toFixed(1)} estrelas` : "Muito bem avaliado",
    discount: p.discountRate ? `${p.discountRate}% OFF` : null,
  }));

  const systemPrompt = `Você é o roteirista sênior e apresentador oficial do canal ACHADINHOS DO DIA.
SEU CANAL SE CHAMA EXCLUSIVAMENTE: "ACHADINHOS DO DIA".
NUNCA use "TechZone", "Tech Zone" ou qualquer outro nome de canal.

Sua marca registrada no Achadinhos do Dia é:
- Tom ENERGÉTICO, DINÂMICO, CURIOSO e BEM HUMORADO (ritmo rápido de retenção para o YouTube).
- Você NÃO lê títulos mecânicos da Shopee nem usa frases engessadas de robô.
- PRÉ-ANÁLISE DOS PRODUTOS: Você identifica exatamente para que serve cada produto na vida real (a utilidade prática, o problema cotidiano que ele resolve, por que as pessoas estão comprando).
- PRODUTO DESTAQUE (HERÓI): No início do vídeo, você faz um gancho de curiosidade sobre o produto mais interessante da lista para segurar a audiência até o final.
- ITENS SUPER BARATOS: Se houver produtos de preço muito baixo (abaixo de R$ 5), destaque pelo ângulo da pechincha inteligente ("custa menos que um pão na padaria"), e não como se fosse um super equipamento.
- LIMPEZA ABSOLUTA DE ÁUDIO: O campo "narration" será lido diretamente por voz neural. NUNCA coloque rubricas de teatro, marcações de direção ou comandos de como atuar (NUNCA escreva "fale com entusiasmo", "[narração]", "locutor:", "(voz animada)"). Coloque APENAS a fala que sai da boca do apresentador!

ANALISE OS ${products.length} PRODUTOS ABAIXO:
${JSON.stringify(productsSummary, null, 2)}

Destaque sugerido por apelo e vendas: "${topSalesItem?.name}".
Menor preço da lista: ${minPriceFormatted}.

INSTRUÇÕES ESTRITAS:
1. "intro": Uma abertura eletrizante de 10 a 15 segundos prendendo o público:
   ("E aí pessoal, sejam muito bem-vindos ao Achadinhos do Dia! Hoje garimpamos na Shopee os achadinhos mais úteis e surpreendentes que estão bombando em vendas... e o item número X você não vai acreditar no que ele faz! Fica até o final que tem de tudo a partir de apenas ${minPriceFormatted}!").
2. "items": Para cada um dos ${products.length} produtos, gere:
   - "pos": número da posição (1 a ${products.length}).
   - "shortName": nome comercial sonoro e natural (3 a 5 palavras, sem códigos de modelo).
   - "hook": frase de impacto ou transição direta chamando atenção para ele.
   - "narration": texto falado completo daquele item (entre 35 e 55 palavras), explicando a utilidade real com entusiasmo e finalizando dizendo que o link oficial com desconto é o número [pos] na descrição. TEXTO PURO FALADO, sem rubricas!
   - "isChampion": true apenas para o produto herói de maior destaque/curiosidade.
   - "isBestValue": true apenas para o achadinho mais econômico.
3. "outro": Encerramento animado com CTA para se inscrever no canal "Achadinhos do Dia" e conferir todos os links na descrição em ordem.

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

export async function generateSingleItemNarration(params: {
  product: {
    name: string;
    price: number | null;
    sales?: number | null;
    ratingStar?: number | null;
    discountRate?: number | null;
  };
  pos: number;
  categoryName?: string;
  apiKey?: string;
}): Promise<TechZoneScriptItem> {
  const { product, pos, categoryName = "Achadinhos", apiKey } = params;
  const key = apiKey || process.env.GEMINI_API_KEY || "";
  const shortName = product.name.split(" ").slice(0, 4).join(" ");
  const priceSpoken = product.price ? `R$ ${product.price.toFixed(2).replace(".", ",")}` : "preço promocional";
  const salesHighlight = product.sales ? `Mais de ${product.sales} vendas na Shopee` : "Sucesso de vendas";
  const ratingStr = product.ratingStar ? product.ratingStar.toFixed(1) : "4.9";

  if (key) {
    const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const prompt = `Você é o narrador oficial do canal ACHADINHOS DO DIA no YouTube.
Crie a fala para o produto da posição ${pos} de um vídeo de achadinhos da Shopee:
- Categoria: ${categoryName}
- Produto: ${product.name}
- Preço: ${priceSpoken}
- Vendas: ${salesHighlight}
- Avaliação: ${ratingStr} estrelas

Regras:
1. Tom dinâmico, curioso, natural, sem formalidade excessiva.
2. Explique brevemente para que serve ou o problema que resolve na vida real.
3. Mencione as vendas e o preço com naturalidade.
4. Finalize dizendo que o link oficial com desconto está no número ${pos} na descrição.
5. O campo "narration" deve conter APENAS o texto falado puro, SEM NENHUMA rubrica ou texto entre colchetes [].
6. Retorne EXCLUSIVAMENTE um JSON:
{
  "shortName": "${shortName}",
  "hook": "frase rápida chamando a atenção para o item",
  "narration": "texto falado de 35 a 55 palavras"
}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.narration) {
              return {
                number: pos,
                productName: product.name,
                shortName: parsed.shortName || shortName,
                hook: parsed.hook || `Dá uma olhada nessa novidade: o ${shortName}!`,
                narration: parsed.narration,
                priceSpoken,
                salesHighlight,
                isChampion: false,
                isBestValue: false,
              };
            }
          }
        }
      } catch {}
    }
  }

  // Fallback imediato de alta qualidade
  const hook = `Agora, na linha de ${categoryName}, dá uma olhada no ${shortName}!`;
  const narration = `Esse é o ${shortName}, perfeito para quem procura praticidade e ótimo acabamento no dia a dia. Na Shopee ele já conta com ${salesHighlight} e nota ${ratingStr}. O preço promocional tá saindo por apenas ${priceSpoken}. O link oficial com garantia tá no número ${pos} da descrição!`;

  return {
    number: pos,
    productName: product.name,
    shortName,
    hook,
    narration,
    priceSpoken,
    salesHighlight,
    isChampion: false,
    isBestValue: false,
  };
}

export function buildFormattedScript({
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
  lines.push(`🎬 ROTEIRO OFICIAL ACHADINHOS DO DIA — ${theme.toUpperCase()}`);
  lines.push("Roteiro Dinâmico de Alta Retenção | Canal Achadinhos do Dia");
  lines.push("═══════════════════════════════════════════════════════════════\n");

  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("🔥 ABERTURA DINÂMICA (Gancho de Retenção)");
  lines.push("───────────────────────────────────────────────────────────────\n");
  lines.push("[NARRAÇÃO DO APRESENTADOR]");
  lines.push(intro + "\n");
  lines.push("[EDIÇÃO VISUAL]");
  lines.push("- Teaser rápido de 2s mostrando o produto campeão em funcionamento.");
  lines.push("- Trilha moderna e animada entrando no ritmo da fala.\n");

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

  const intro = `E aí pessoal, sejam muito bem-vindos ao Achadinhos do Dia! Hoje garimpamos na Shopee os achadinhos mais incríveis e úteis que estão bombando de verdade. E tem de tudo: opções a partir de apenas ${minPriceFormatted}, até o item número ${champPos}, o famoso ${champName}, com ${champSales}! Segura aí porque a lista de hoje vale muito a pena. Bora conferir!`;

  const outro = `E aí, qual desses achadinhos você levaria pra casa hoje? Comenta aqui embaixo no Achadinhos do Dia! Não esquece de deixar o like e se inscrever no canal para não perder os próximos achadinhos. Todos os links oficiais estão organizados na descrição em ordem. Até a próxima!`;

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
