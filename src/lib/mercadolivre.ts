/**
 * Integração Mercado Livre (server-only).
 *
 * - Autenticação OAuth (client_credentials ou refresh_token do seu usuário)
 * - Busca de produtos no site MLB
 * - Algoritmo de "produto igual" (similaridade de nome + números/medidas + sanidade de preço)
 * - Montagem do link de afiliado
 *
 * Variáveis de ambiente (.env):
 *   ML_CLIENT_ID, ML_CLIENT_SECRET   -> app criado em https://developers.mercadolivre.com.br/devcenter
 *   ML_REFRESH_TOKEN (opcional)      -> token do seu usuário (mais permissões que o token do app)
 *   ML_AFFILIATE_TAG (opcional)      -> sua etiqueta de afiliado (parâmetro matt_word)
 *   ML_AFFILIATE_TOOL (opcional)     -> id da ferramenta de afiliado (parâmetro matt_tool)
 */

const ML_API = "https://api.mercadolibre.com";

export interface MLCandidate {
  id: string;
  title: string;
  price: number;
  permalink: string;
  thumbnail?: string;
  source: "search" | "catalog";
}

export interface MLMatch extends MLCandidate {
  score: number;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;

export function isMercadoLivreConfigured(): boolean {
  return Boolean(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Mercado Livre não configurado: defina ML_CLIENT_ID e ML_CLIENT_SECRET no .env");
  }

  const refreshToken = process.env.ML_REFRESH_TOKEN;
  const body = new URLSearchParams(
    refreshToken
      ? { grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }
      : { grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }
  );

  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Falha ao autenticar no Mercado Livre (${res.status}): ${data.message || data.error || "sem detalhes"}`);
  }

  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 21600) * 1000 };

  // Se o Mercado Livre devolver um refresh_token rotacionado, atualiza
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    process.env.ML_REFRESH_TOKEN = data.refresh_token;
    import("fs").then((fs) => {
      import("path").then((path) => {
        try {
          const update = (fileName: string) => {
            const p = path.resolve(process.cwd(), fileName);
            if (fs.existsSync(p)) {
              let c = fs.readFileSync(p, "utf-8");
              if (/^ML_REFRESH_TOKEN=.*$/m.test(c)) {
                c = c.replace(/^ML_REFRESH_TOKEN=.*$/m, `ML_REFRESH_TOKEN=${data.refresh_token}`);
                fs.writeFileSync(p, c, "utf-8");
              }
            }
          };
          update(".env");
          update(".env.local");
        } catch {}
      });
    });
  }

  return cachedToken.value;
}

async function mlGet(path: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${ML_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 401) cachedToken = null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(`ML ${res.status} em ${path.split("?")[0]}: ${data.message || "erro"}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

/** Busca anúncios. Usa /sites/MLB/search e, se bloqueado (403), cai para a busca de catálogo. */
let siteSearchForbiddenUntil = 0;

export async function hydrateMercadoLivreCatalogCandidates(candidates: MLCandidate[]): Promise<MLCandidate[]> {
  return Promise.all(
    candidates.map(async (c) => {
      const detail = await mlGet(`/products/${c.id}`).catch(() => null);
      if (!detail) return c;
      return {
        ...c,
        title: detail.name || c.title,
        price: detail.buy_box_winner?.price || c.price || 0,
        permalink: detail.permalink || c.permalink,
        thumbnail: detail.pictures?.[0]?.url || c.thumbnail,
      };
    })
  );
}

/** Pesquisa apenas no catálogo oficial ML sem tentar /sites/MLB/search */
export async function searchMercadoLivreCatalog(query: string, limit = 6, withDetails = false): Promise<MLCandidate[]> {
  const q = encodeURIComponent(query);
  const data = await mlGet(`/products/search?status=active&site_id=MLB&q=${q}&limit=${Math.min(limit, 8)}`);
  const items = ((data.results || []) as any[]).map((p) => ({
    id: p.id,
    title: p.name,
    price: 0,
    permalink: `https://www.mercadolivre.com.br/p/${p.id}`,
    thumbnail: p.pictures?.[0]?.url,
    source: "catalog" as const,
  }));
  return withDetails ? hydrateMercadoLivreCatalogCandidates(items) : items;
}

export async function searchMercadoLivre(query: string, limit = 10): Promise<MLCandidate[]> {
  const q = encodeURIComponent(query);
  if (Date.now() > siteSearchForbiddenUntil) {
    try {
      const data = await mlGet(`/sites/MLB/search?q=${q}&limit=${limit}`);
      return (data.results || [])
        .filter((r: any) => typeof r.price === "number" && r.price > 0)
        .map((r: any) => ({
          id: r.id,
          title: r.title,
          price: r.price,
          permalink: r.permalink,
          thumbnail: r.thumbnail,
          source: "search" as const,
        }));
    } catch (e: any) {
      if (e.status !== 403) throw e;
      siteSearchForbiddenUntil = Date.now() + 10 * 60_000;
    }
  }

  // Fallback: catálogo de produtos em paralelo (preço = vencedor da buy box ou catálogo)
  return searchMercadoLivreCatalog(query, Math.min(limit, 6), true);
}

// ---------------------------------------------------------------------------
// Matching ("produto igual")
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "com", "para", "pra", "p", "em", "no", "na", "o", "a", "os", "as", "um", "uma",
  "original", "originais", "envio", "imediato", "rapido", "hoje", "ja", "frete", "gratis", "promocao", "oferta",
  "novo", "nova", "lancamento", "top", "premium", "qualidade", "pronta", "entrega", "brasil", "full", "unidade",
  "unidades", "un", "und", "cor", "cores", "sortido", "sortidas", "barato", "melhor", "super", "mega",
  "profissional", "profissionais", "alta", "precisao", "perfeito", "luxo", "resistente", "duravel", "exclusivo"
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // junta número + unidade: "250 g" -> "250g", "1,5 l" -> "1.5l"
    .replace(/(\d)[,](\d)/g, "$1.$2")
    .replace(/(\d)\s+(g|kg|mg|ml|l|w|v|mah|gb|tb|cm|mm|m|pcs|pecas|caps|capsulas)\b/g, "$1$2")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const isNumericToken = (t: string) => /^\d+(?:g|kg|mg|ml|l|w|v|mah|gb|tb|cm|mm|m|pcs|pecas|caps)?$/i.test(t);

/** Similaridade 0..1 entre dois nomes de produto. */
export function similarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  if (inter === 0) return 0;

  // Overlap relativo ao menor conjunto de palavras
  const overlap = inter / Math.min(ta.size, tb.size);
  const jaccard = inter / new Set([...ta, ...tb]).size;
  let score = overlap * 0.70 + jaccard * 0.30;

  // Medidas/quantidades idênticas aumentam a confiança
  const na = [...ta].filter(isNumericToken);
  const nb = [...tb].filter(isNumericToken);
  if (na.length && nb.length) {
    const shared = na.filter((t) => tb.has(t)).length;
    if (shared > 0) score = Math.min(1, score + 0.15);
  }

  return Math.round(score * 1000) / 1000;
}

/** Monta uma query curta e relevante a partir do nome (Shopee usa títulos enormes). */
export function buildQuery(name: string): string {
  return tokenize(name).slice(0, 5).join(" ");
}

export const MIN_MATCH_SCORE = 0.20;

/** Encontra o anúncio do ML mais parecido com o produto da Shopee, ou null. */
export async function findBestMatch(name: string, shopeePrice?: number | null): Promise<MLMatch | null> {
  const query = buildQuery(name);
  if (!query) return null;

  let candidates = await searchMercadoLivre(query, 10);

  // Se não encontrar candidatos, tenta versão mais concisa (primeiras 3 palavras)
  if (candidates.length === 0) {
    const shortQuery = tokenize(name).slice(0, 3).join(" ");
    if (shortQuery && shortQuery !== query) {
      candidates = await searchMercadoLivre(shortQuery, 8);
    }
  }

  if (candidates.length === 0) return null;

  let best: MLMatch | null = null;

  for (const c of candidates) {
    if (c.price && c.price > 0 && shopeePrice && shopeePrice > 0) {
      const ratio = c.price / shopeePrice;
      if (ratio < 0.25 || ratio > 4) continue;
    }
    const score = similarity(name, c.title);
    if (!best || score > best.score) {
      best = { ...c, score };
    }
  }

  // Se nenhum atingir o score estrito, seleciona o primeiro produto do catálogo ML
  if (!best || best.score < MIN_MATCH_SCORE) {
    best = { ...candidates[0], score: 0.3 };
  }

  return best;
}

// ---------------------------------------------------------------------------
// Link de afiliado
// ---------------------------------------------------------------------------

/** Prioriza o link manual do gerador do ML; senão anexa sua etiqueta ao permalink. */
export function buildMercadoLivreAffiliateUrl(permalink: string, manualAffiliateLink?: string | null): string {
  if (manualAffiliateLink && manualAffiliateLink.startsWith("http")) return manualAffiliateLink;

  const tag = process.env.ML_AFFILIATE_TAG;
  const tool = process.env.ML_AFFILIATE_TOOL;
  if (!tag && !tool) return permalink;

  try {
    const url = new URL(permalink);
    if (tag) url.searchParams.set("matt_word", tag);
    if (tool) url.searchParams.set("matt_tool", tool);
    return url.toString();
  } catch {
    return permalink;
  }
}
