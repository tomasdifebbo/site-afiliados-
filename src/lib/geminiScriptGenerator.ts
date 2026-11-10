/**
 * Gerador de Roteiro e Legenda Humanizados com Inteligência Artificial Google Gemini
 * Especializado em vídeos virais de achadinhos para Kwai, TikTok, Instagram Reels e YouTube Shorts (9:16)
 */

export interface GeneratedScriptResult {
  script: string;
  caption: string;
  shortName: string;
  pinnedComment: string;
  viralTitles: string[];
  hashtags: string[];
  provider: "gemini" | "fallback";
}

export interface ScriptProductInput {
  name: string;
  price?: number | null;
  categoryName?: string | null;
  description?: string | null;
  apiKey?: string;
  maskedUrl?: string | null;
}

// ── Fallback Heurístico Local de Alta Conversão ──────────────────────────────
function fallbackScript(product: ScriptProductInput): GeneratedScriptResult {
  const name = product.name.trim();
  const cat = product.categoryName || "achadinhos";
  const priceFormatted = product.price
    ? `R$ ${product.price.toFixed(2).replace(".", ",")}`
    : "o preço promocional da semana";

  const shortName = name
    .replace(/^(kit \d+x?|par de|jogo de|mini|super)\s+/i, "")
    .split(/[-,|]/)[0]
    .trim()
    .slice(0, 45);

  const hooks = [
    `Tudo isso por ${priceFormatted}! Se você quer o kit completo do ${shortName}, olha isso:`,
    `Olha o que acabou de chegar na Shopee: ${shortName} com o combo completo por apenas ${priceFormatted}!`,
    `Para de gastar à toa comprando separado: esse kit completo do ${shortName} tá saindo por só ${priceFormatted}:`,
    `Achado surreal na Shopee: ${shortName} completo por inacreditáveis ${priceFormatted}!`,
  ];
  const hook = hooks[Math.floor(Math.random() * hooks.length)];

  const script = `${hook} Ele vem completinho, pronto pro uso e resolve sua vida na hora. No anúncio oficial da Shopee são milhares de avaliações 5 estrelas. Quer garantir antes que acabe o estoque? Comenta "QUERO" que eu te envio o link com desconto no direct, ou clica no primeiro comentário fixado e na bio!`;

  const targetLink = product.maskedUrl || "https://achadinhosdodia.com.br";

  const caption = `🔥 ACHADINHO VIRAL SHOPEE: ${shortName}!
💸 De um valor muito mais alto por apenas: ${priceFormatted}
⭐ Mais de 2.000 avaliações 5 estrelas confirmadas!

👉 Pegue o link oficial com desconto exclusivo:
${targetLink}

💬 Comente "QUERO" para receber os melhores cupons no seu direct!
⚠️ Indicação oficial de afiliado. Preços e estoque podem variar a qualquer momento.

#achadinhos #shopee #achadinhosshopee #comprinhas #dicasparacasa #utilidades #review #viral #foryou`;

  const pinnedComment = `🔥 LINK OFICIAL COM DESCONTO DO VÍDEO:
👉 ${targetLink}

📦 Cupons de Frete Grátis e Desconto ativos hoje na Shopee!
💬 Comente "QUERO" para receber novos achadinhos em primeira mão!`;

  const viralTitles = [
    `🔥 Esse achadinho secreto da Shopee tá explodindo de vendas!`,
    `⚡ Custou só ${priceFormatted} e parece produto de R$ 300!`,
    `😱 Não compre nada de ${cat} antes de ver essa invenção!`,
  ];

  const hashtags = [
    "#achadinhos",
    "#shopee",
    "#achadinhosshopee",
    "#comprinhas",
    "#dicasparacasa",
    "#utilidades",
    "#viral",
    "#foryou",
  ];

  return {
    script,
    caption,
    shortName,
    pinnedComment,
    viralTitles,
    hashtags,
    provider: "fallback",
  };
}

// ── Gerador Principal via Google Gemini AI ────────────────────────────────────
export async function generateProductScriptWithGemini(
  product: ScriptProductInput
): Promise<GeneratedScriptResult> {
  const apiKey = product.apiKey || process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    console.log("[Gemini] Nenhuma chave configurada. Usando fallback local.");
    return fallbackScript(product);
  }

  const name = product.name.trim();
  const cat = product.categoryName || "achadinhos e utilidades";
  const priceFormatted = product.price
    ? `R$ ${product.price.toFixed(2).replace(".", ",")}`
    : "um preço super acessível";

  const prompt = `Você é um dos maiores especialistas do mundo em monetização rápida e criação de vídeos virais de vendas para TikTok, YouTube Shorts, Kwai e Instagram Reels (formato vertical 9:16).
Sua missão é criar o roteiro, títulos de alto clique (CTR), comentário fixado de conversão imediata e legenda para o seguinte produto:

- Nome Oficial: "${name}"
- Categoria: ${cat}
- Preço com Desconto na Shopee: ${priceFormatted}
${product.maskedUrl ? `- Link Oficial Mascarado do Produto: ${product.maskedUrl}` : ""}
${product.description ? `- Detalhes do item: ${product.description.slice(0, 300)}` : ""}

REGRAS DE OURO PARA MONETIZAÇÃO RÁPIDA (MÁXIMA RETENÇÃO EM SHORTS):
1. ROTEIRO ("script") — RÁPIDO, DIRETO E HIPNÓTICO (MÁXIMO 20 A 25 SEGUNDOS):
   - Duração falada: Máximo de 20 a 25 segundos (entre 45 e 60 palavras no máximo). Vídeos longos de 40s perdem mais de 75% da audiência.
   - 0-2 segundos (GANCHO VISUAL E DIRETO NA OFERTA): PROIBIDO iniciar com perguntas clichês como "Cansado de...?", "Você sabia que...?" ou "Se você sofre com...". COMECE DIRETAMENTE na oferta irresistível nos primeiros 2 segundos! (Exemplos: "Tudo isso por apenas ${priceFormatted}: ${name} completo!", "Olha esse kit absurdo na Shopee por só ${priceFormatted}!", "Celular novo de 256GB com fone e relógio de brinde por ${priceFormatted}!").
   - 3-12 segundos (OS 3 MAIORES BENEFÍCIOS DO COMBO): Apresente em rajada rápida o que vem no kit e a vantagem prática, sem enrolar.
   - 13-18 segundos (ANCONRAGEM DE PREÇO & PROVA SOCIAL): "Avaliação máxima na Shopee e tá saindo por só ${priceFormatted} hoje."
   - 18-24 segundos (CTA RÁPIDO DE COMENTÁRIO): "Quer o link? Comenta 'QUERO' que eu te mando no direct ou clica no link da bio e no primeiro comentário fixado!"
   - O texto será lido por uma voz neural. NÃO use emojis, nem tags tipo [música] ou [vídeo], apenas o texto corrido natural em português do Brasil.

2. COMENTÁRIO FIXADO ("pinnedComment"):
   - O comentário que gera 90% das vendas de afiliados.
   - Deve conter emojis de fogo/atenção, o link mascarado oficial (${product.maskedUrl || "link na bio"}), menção a Frete Grátis/Cupons Shopee e incentivo a comentar "QUERO".

3. 3 TÍTULOS MAGNÉTICOS DE ALTO CTR ("viralTitles"):
   - 3 opções de títulos com emojis, curiosidade irresistível e apelo de urgência/preço para o Shorts/TikTok.

4. LEGENDA DE ALTO ALCANCE ("caption"):
   - Legenda completa e formatada com emojis, preço, link oficial mascarado e aviso legal de afiliado.

Retorne estritamente um JSON no seguinte formato:
{
  "script": "texto da narração...",
  "caption": "texto da legenda...",
  "shortName": "nome curto (máx 4 palavras)",
  "pinnedComment": "comentário fixado pronto para copiar...",
  "viralTitles": ["Título 1", "Título 2", "Título 3"],
  "hashtags": ["#achadinhos", "#shopee", "#dicas", "#comprinhas", "#viral"]
}`;

  try {
    // Modelos Gemini suportados em ordem de preferência
    const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.8,
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini status ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawContent) {
          throw new Error("Gemini retornou conteúdo vazio");
        }

        const parsed = JSON.parse(rawContent);

        if (parsed.script && parsed.caption) {
          const targetLink = product.maskedUrl || "https://achadinhosdodia.com.br";
          const defaultPinned = `🔥 LINK OFICIAL COM DESCONTO DO VÍDEO:\n👉 ${targetLink}\n\n📦 Cupons de Frete Grátis e Desconto ativos hoje na Shopee!\n💬 Comente "QUERO" para receber novas promoções em primeira mão!`;

          const defaultTitles = [
            `🔥 Esse achadinho secreto da Shopee tá explodindo de vendas!`,
            `⚡ Custou só ${priceFormatted} e parece produto de R$ 300!`,
            `😱 Não compre nada de ${cat} antes de ver essa invenção!`,
          ];

          return {
            script: parsed.script.trim(),
            caption: parsed.caption.trim(),
            shortName: (parsed.shortName || name.slice(0, 35)).trim(),
            pinnedComment: (parsed.pinnedComment || defaultPinned).trim(),
            viralTitles: Array.isArray(parsed.viralTitles) && parsed.viralTitles.length > 0
              ? parsed.viralTitles
              : defaultTitles,
            hashtags: Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
              ? parsed.hashtags
              : ["#achadinhos", "#shopee", "#achadinhosshopee", "#viral", "#foryou"],
            provider: "gemini",
          };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini] Falha com modelo ${model}:`, err.message);
      }
    }

    console.warn("[Gemini] Todos os modelos falharam. Usando fallback.", lastError?.message);
    return fallbackScript(product);
  } catch (globalErr: any) {
    console.error("[Gemini Global Err]", globalErr);
    return fallbackScript(product);
  }
}
