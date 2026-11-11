/**
 * 🧠 ANALISADOR DE PRODUTOS E CASAMENTO INTELIGENTE (Shopee x Mercado Livre)
 * Utiliza IA Google Gemini para entender o que o produto realmente é (corrigindo traduções
 * automáticas confusas como "prego" no lugar de "unha"), formular a busca ideal no Mercado Livre
 * e validar rigorosamente se o produto encontrado é idêntico para evitar redirecionamento errado.
 */

import { searchMercadoLivre } from "./mercadolivre";

export interface MLSmartMatchResult {
  url: string;
  type: "direct_product" | "clean_search";
  matchedId?: string;
  matchedTitle?: string;
  reason?: string;
}

export async function resolveMercadoLivreWithAI(
  productName: string,
  price?: number | null
): Promise<MLSmartMatchResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Se não houver chave Gemini, cai na busca sanitizada direta
  if (!apiKey) {
    const cleanQuery = productName
      .replace(/^(kit \d+x?|par de|jogo de|mini|super)\s+/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    return {
      url: `https://lista.mercadolivre.com.br/${encodeURIComponent(cleanQuery)}`,
      type: "clean_search",
    };
  }

  try {
    // ── PASSO 1: O Gemini analisa o produto e descobre o que ele realmente é ───────────
    const analysisPrompt = `Você é um especialista em catálogo de e-commerce brasileiro (Shopee e Mercado Livre).
Analise este produto da Shopee (que frequentemente contém títulos com tradução automática literal ou termos confusos como "prego" no lugar de "unha", "xxf", "alta precisão"):
Título original: "${productName}"
${price ? `Preço de referência: R$ ${price.toFixed(2)}` : ""}

Sua missão:
1. "realProduct": O nome real do item em português do Brasil correto e claro.
2. "searchTerms": Array com os 2 ou 3 melhores termos curtos e exatos de busca para o Mercado Livre (ex: ["broca tungstenio unhas", "broca lixadeira unha"]).

Responda ESTRITAMENTE em formato JSON:
{
  "realProduct": "...",
  "searchTerms": ["...", "..."]
}`;

    const geminiRes1 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!geminiRes1.ok) {
      throw new Error(`Gemini status ${geminiRes1.status}`);
    }

    const data1 = await geminiRes1.json();
    const rawAnalysis = data1.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawAnalysis) throw new Error("Resposta vazia do Gemini");

    const analysis = JSON.parse(rawAnalysis) as { realProduct: string; searchTerms: string[] };
    const searchTerms = analysis.searchTerms?.filter(Boolean) || [analysis.realProduct];

    // ── PASSO 2: Busca candidatos no catálogo do Mercado Livre com os termos otimizados ──
    const allCandidates: any[] = [];
    for (const term of searchTerms) {
      try {
        const found = await searchMercadoLivre(term, 4);
        if (found?.length) allCandidates.push(...found);
      } catch {}
    }

    // Desduplica candidatos por ID
    const uniqueCandidates = Array.from(
      new Map(allCandidates.map((c) => [c.id, c])).values()
    ).slice(0, 5);

    // Se nenhum candidato de catálogo foi retornado, usa a busca limpa do termo oficial
    if (uniqueCandidates.length === 0) {
      const bestSearch = searchTerms[0] || analysis.realProduct;
      const slug = bestSearch
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      return {
        url: `https://lista.mercadolivre.com.br/${slug}`,
        type: "clean_search",
        reason: "Sem catálogo direto, gerada busca com termo limpo",
      };
    }

    // ── PASSO 3: O Gemini audita os candidatos e aprova somente se for o MESMO produto ─
    const verifyPrompt = `Produto Original Shopee: "${productName}" (Identificado como: "${analysis.realProduct}")

Candidatos encontrados no Mercado Livre:
${uniqueCandidates.map((c, i) => `${i + 1}. ID: "${c.id}" - Título: "${c.title}"`).join("\n")}

Sua missão de auditoria:
Avalie com rigor se algum dos candidatos é exatamente o MESMO tipo de produto (ou equivalente direto fiel).
REGRAS CRÍTICAS DE SEGURANÇA:
- Se os candidatos forem de outra utilidade (ex: broca de madeira/CNC quando o produto é de manicure/unha, ou lixas de refil quando é a broca), NÃO aprove!
- Só escolha se você tiver certeza de que o visitante vai receber exatamente o produto que procurava.

Responda ESTRITAMENTE em formato JSON:
{
  "bestMatchId": "ID do candidato aprovado ou null se nenhum for o produto correto",
  "reason": "breve explicação",
  "confidence": "high" | "medium" | "low"
}`;

    const geminiRes2 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: verifyPrompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (geminiRes2.ok) {
      const data2 = await geminiRes2.json();
      const rawVerify = data2.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawVerify) {
        const verification = JSON.parse(rawVerify) as {
          bestMatchId?: string | null;
          reason?: string;
          confidence?: string;
        };

        if (verification.bestMatchId) {
          const winner = uniqueCandidates.find((c) => c.id === verification.bestMatchId);
          if (winner) {
            return {
              url: `https://www.mercadolivre.com.br/p/${winner.id}`,
              type: "direct_product",
              matchedId: winner.id,
              matchedTitle: winner.title,
              reason: verification.reason,
            };
          }
        }
      }
    }

    // Se a auditoria do Gemini rejeitou os candidatos por incompatibilidade:
    // Redireciona para a pesquisa do Mercado Livre com o termo LIMPO E PRECISO fornecido pelo Gemini!
    const bestSearch = searchTerms[0] || analysis.realProduct;
    const cleanSlug = bestSearch
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return {
      url: `https://lista.mercadolivre.com.br/${cleanSlug}`,
      type: "clean_search",
      reason: "Auditoria rejeitou candidatos incompatíveis, busca limpa acionada",
    };
  } catch (err: any) {
    console.warn("[ML AI Matcher] Falha na análise inteligente:", err.message);
    const cleanQuery = productName
      .replace(/^(kit \d+x?|par de|jogo de|mini|super)\s+/i, "")
      .replace(/[-_]+/g, " ")
      .trim();
    return {
      url: `https://lista.mercadolivre.com.br/${encodeURIComponent(cleanQuery)}`,
      type: "clean_search",
    };
  }
}
