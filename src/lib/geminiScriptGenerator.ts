/**
 * Gerador de Roteiro e Legenda Humanizados com Inteligência Artificial Google Gemini
 * Especializado em vídeos virais de achadinhos para Kwai, TikTok, Instagram Reels e YouTube Shorts (9:16)
 */

export interface GeneratedScriptResult {
  script: string;
  caption: string;
  shortName: string;
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

// ── Fallback Heurístico Local (Custo R$ 0, sem depender de internet) ───────────
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
    `Sabe quando você quer praticidade e economia sem complicação? Dá uma olhada nesse achadinho de ${cat}:`,
    `Se você gosta de encontrar coisas úteis que facilitam a rotina em casa, veja só o que encontramos:`,
    `Para quem procura um bom custo-benefício com utilidade de verdade no dia a dia, essa descoberta é ideal:`,
    `Quer deixar o seu espaço mais organizado e moderno sem gastar muito? Veja essa opção:`,
  ];
  const hook = hooks[Math.floor(Math.random() * hooks.length)];

  const script = `${hook} é o ${shortName}. Ele se destaca pela versatilidade e acabamento, perfeito para quem quer conforto e funcionalidade. No anúncio oficial da Shopee, o preço confirmado é de ${priceFormatted}. Dá uma conferida nas fotos e avaliações completas no link oficial. Este conteúdo contém indicação de afiliado. O link com a oferta está no primeiro comentário e na bio!`;

  const linkLine = product.maskedUrl
    ? `👉 Link oficial com desconto:\n${product.maskedUrl}`
    : `👉 Link oficial com desconto no primeiro comentário fixado e na bio!`;

  const caption = `✨ Achadinho Shopee: ${shortName}!
🔥 Preço verificado: ${priceFormatted}
⭐ Excelente avaliação de compradores reais!

${linkLine}

⚠️ Conteúdo com indicação de afiliado. Preços e estoque podem variar.

#achadinhos #shopee #achadinhosshopee #comprinhas #dicasparacasa #utilidades #review #kwai #viral`;

  return { script, caption, shortName, provider: "fallback" };
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

  const prompt = `Você é um roteirista de elite especialista em criar vídeos virais e altamente persuasivos de achadinhos para Kwai, TikTok, Instagram Reels e YouTube Shorts (formato vertical 9:16).
Sua missão é criar um roteiro sob medida e humanizado para o seguinte produto:

- Nome Oficial: "${name}"
- Categoria: ${cat}
- Preço com Desconto na Shopee: ${priceFormatted}
${product.maskedUrl ? `- Link Oficial Mascarado do Produto: ${product.maskedUrl}` : ""}
${product.description ? `- Detalhes do item: ${product.description.slice(0, 300)}` : ""}

Diretrizes estritas para o roteiro ("script"):
1. O texto será lido por uma voz neural humana (Piper TTS / ElevenLabs). Escreva em linguagem 100% natural, falada no dia a dia do Brasil.
2. Duração ideal de fala: entre 28 e 45 segundos (em torno de 65 a 95 palavras).
3. ESTRUTURA VIRAL:
   - Primeiro 3 segundos (O Gancho): Uma frase impactante focada no problema ou desejo real que o produto resolve (Ex: "Se você também odeia...", "Eu não acreditava até testar...", "O segredo para nunca mais sofrer com...").
   - O Miolo: Demonstre o benefício real, praticidade e por que vale muito a pena ter esse item em casa ou na rotina.
   - Ancoragem de Preço: Mencione o preço oficial verificado na Shopee (${priceFormatted}).
   - Chamada para Ação (CTA): Convide quem assiste a comentar "EU QUERO" ou acessar o link direto na bio e no primeiro comentário fixado.
4. NÃO inclua emojis, marcas de direção de palco tipo [música] ou [corta], nem aspas desnecessárias no campo "script". Apenas o texto corrido que o narrador vai falar.

Diretrizes para a legenda ("caption"):
- Legenda atrativa com emojis, preço em destaque, chamada para comentar "EU QUERO", hashtags virais (#achadinhos, #shopee, #kwai, #dicas, #comprinhas) e aviso obrigatório de divulgação de afiliado.
${product.maskedUrl ? `- Inclua exatamente o link mascarado na legenda: ${product.maskedUrl} (sem adicionar parâmetros ou origens extras).` : ""}

Diretrizes para "shortName":
- Nome curto, direto e comercial (máximo 4 a 5 palavras).

Retorne estritamente um JSON no seguinte formato:
{
  "script": "texto da narração...",
  "caption": "texto da legenda...",
  "shortName": "nome curto..."
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
          return {
            script: parsed.script.trim(),
            caption: parsed.caption.trim(),
            shortName: (parsed.shortName || name.slice(0, 35)).trim(),
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
