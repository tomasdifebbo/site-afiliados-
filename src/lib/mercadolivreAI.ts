import {
  MLCandidate,
  searchMercadoLivreCatalog,
} from "./mercadolivre";

export interface MLSmartMatchResult {
  url: string;
  type: "direct_product" | "clean_search";
  matchedId?: string;
  matchedTitle?: string;
  reason?: string;
}

interface GeminiAnalysis {
  cleanSearchQuery: string;
  searchTerms: string[];
  essentialKeywords: string[];
  category: string;
}

interface GeminiMatchPick {
  bestId: string | null;
  confidence: number;
  reason: string;
}

const GEMINI_MODELS: Array<{ model: string; noThink: boolean }> = [
  { model: "gemini-3.1-flash-lite", noThink: true },
  { model: "gemini-3-flash-preview", noThink: true },
  { model: "gemini-2.5-flash", noThink: true },
  { model: "gemini-3.5-flash-lite", noThink: false },
];

const aiMatchCache = new Map<string, { result: MLSmartMatchResult; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function sanitizeQueryFallback(productName: string): string {
  return productName
    .replace(/[/\\|()[\]{}]+/g, " ")
    .replace(/^(kit \d+x?|par de|jogo de|mini|super|profissional)\s+/i, "")
    .replace(/\b(envio imediato|pronta entrega|original|promoção|promocao|oferta|alta precisão|alta precisao|prego)\b/gi, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMlCleanSearchUrl(query: string): string {
  const clean = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const slug = (clean || "ofertas").split(" ").slice(0, 6).join("-").toLowerCase();
  return `https://lista.mercadolivre.com.br/${encodeURIComponent(slug)}`;
}

async function callGeminiJson<T>(apiKey: string, prompt: string, timeoutMs = 3500): Promise<T | null> {
  for (const { model, noThink } of GEMINI_MODELS) {
    try {
      const generationConfig: Record<string, unknown> = {
        temperature: 0.1,
        responseMimeType: "application/json",
      };
      if (noThink) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
        }
      );

      if (!res.ok) {
        // Retry with fallback model on overload/rate/unsupported errors
        continue;
      }

      const data = await res.json();
      const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!rawText) continue;

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
    } catch {
      // Timeout or parse failure — try next model
    }
  }
  return null;
}

/**
 * Resolve o melhor destino no Mercado Livre usando análise semântica com Gemini + catálogo oficial ML.
 * Projeta latência total <= ~3-5s para evitar timeout serverless e rejeita categorias incompatíveis.
 */
export async function resolveMercadoLivreWithAI(
  productName: string,
  shopeePrice?: number | null
): Promise<MLSmartMatchResult> {
  const startedAt = Date.now();
  const DEADLINE_MS = 7500;
  const cacheKey = `${productName.trim().toLowerCase()}::${shopeePrice ?? ""}`;
  const cached = aiMatchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const fallbackQuery = sanitizeQueryFallback(productName) || productName.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      url: buildMlCleanSearchUrl(fallbackQuery),
      type: "clean_search",
      reason: "Sem GEMINI_API_KEY configurada",
    };
  }

  // Etapa 1: Análise semântica e termos de busca otimizados
  const analysisPrompt = `Analise este título de produto da Shopee (às vezes traduzido errado do inglês/chinês, ex: "prego" = unha/nail):
"${productName}"

Tarefa:
1. Identifique exatamente o que é o produto, seu uso/domínio real e material/especificação principal.
2. Crie "cleanSearchQuery": 3 a 5 palavras claras em português que um comprador digitaria no Mercado Livre (sem códigos aleatórios nem adjetivos de marketing como "profissional", "alta precisão").
3. Crie "searchTerms": lista de 2 a 3 termos curtos (2 a 4 palavras cada) para buscar no catálogo do Mercado Livre, mantendo SEMPRE o domínio correto (ex: inclua "unha" ou "manicure" para broca/fresa de unha, para nunca confundir com broca de madeira/parede; inclua material como "tungstenio" se aplicável).
4. Liste "essentialKeywords" (2 a 4 palavras-chave do produto real) e "category" (domínio curto).

Retorne APENAS JSON:
{"cleanSearchQuery":"...","searchTerms":["termo 1","termo 2","termo 3"],"essentialKeywords":["k1","k2"],"category":"..."}`;

  const analysis = await callGeminiJson<GeminiAnalysis>(apiKey, analysisPrompt, 3500);
  const cleanSearchQuery = analysis?.cleanSearchQuery?.trim() || fallbackQuery;
  const searchTerms = (analysis?.searchTerms?.length ? analysis.searchTerms : [cleanSearchQuery])
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 3);

  // Etapa 2: Busca paralela no catálogo ML sem tentar /sites/MLB/search (evita 403 e latência extra)
  const searchGroups = await Promise.all(
    searchTerms.map((term) => searchMercadoLivreCatalog(term, 6, false).catch(() => [] as MLCandidate[]))
  );

  const uniqueMap = new Map<string, MLCandidate>();
  for (const list of searchGroups) {
    for (const item of list) {
      if (item.id && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }
  }

  const candidates = Array.from(uniqueMap.values()).slice(0, 10);

  if (candidates.length === 0) {
    const res: MLSmartMatchResult = {
      url: buildMlCleanSearchUrl(cleanSearchQuery),
      type: "clean_search",
      reason: "Nenhum candidato retornado no catálogo ML",
    };
    aiMatchCache.set(cacheKey, { result: res, expiresAt: Date.now() + CACHE_TTL_MS });
    return res;
  }

  // Etapa 3: Verificação semântica e escolha do candidato exato
  const remainingMs = DEADLINE_MS - (Date.now() - startedAt);
  if (remainingMs < 1800) {
    const res: MLSmartMatchResult = {
      url: buildMlCleanSearchUrl(cleanSearchQuery),
      type: "clean_search",
      reason: "Tempo limite atingido antes da verificação final",
    };
    return res;
  }

  const formattedCandidates = candidates
    .map((c) => `- ID: ${c.id} | Título: ${c.title} | ${c.price > 0 ? `Preço: R$ ${c.price.toFixed(2)}` : "Preço: n/d"}`)
    .join("\n");

  const matchPrompt = `Compare o produto original da Shopee com os candidatos do Mercado Livre.

Produto Shopee: "${productName}"
Categoria/Uso esperado: "${analysis?.category || cleanSearchQuery}"
Palavras essenciais: ${JSON.stringify(analysis?.essentialKeywords || [])}
${shopeePrice ? `Preço na Shopee: R$ ${shopeePrice.toFixed(2)}` : ""}

Candidatos no Mercado Livre:
${formattedCandidates}

Regras rigorosas:
1. Escolha um candidato APENAS se for o MESMO tipo de produto e MESMA finalidade/domínio (ex: broca/fresa de manicure NÃO pode casar com broca de madeira/concreto/parede; aparelho principal NÃO pode casar com refil/acessório avulso se o preço for incompatível).
2. Diferenças pequenas de marca genérica ou cor são aceitáveis SE for exatamente o mesmo produto/kit equivalente.
3. Se nenhum candidato corresponder com segurança, retorne "bestId": null e "confidence": 0.

Retorne APENAS JSON:
{"bestId":"MLB... ou null","confidence":0.0,"reason":"breve justificativa"}`;

  const pick = await callGeminiJson<GeminiMatchPick>(apiKey, matchPrompt, Math.min(3500, remainingMs));

  if (pick?.bestId && (pick.confidence ?? 0) >= 0.72) {
    const chosen = candidates.find((c) => c.id === pick.bestId);
    if (chosen?.permalink) {
      const res: MLSmartMatchResult = {
        url: chosen.permalink,
        type: "direct_product",
        matchedId: chosen.id,
        matchedTitle: chosen.title,
        reason: pick.reason,
      };
      aiMatchCache.set(cacheKey, { result: res, expiresAt: Date.now() + CACHE_TTL_MS });
      return res;
    }
  }

  const res: MLSmartMatchResult = {
    url: buildMlCleanSearchUrl(cleanSearchQuery),
    type: "clean_search",
    reason: pick?.reason || "Nenhum candidato passou na verificação de compatibilidade",
  };
  aiMatchCache.set(cacheKey, { result: res, expiresAt: Date.now() + CACHE_TTL_MS });
  return res;
}
