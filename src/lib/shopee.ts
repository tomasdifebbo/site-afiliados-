import crypto from "crypto";

/**
 * Server-only client for the Shopee Affiliate Open API (GraphQL).
 * Credentials come from env vars and must never be exposed to the browser.
 *
 * Auth: Authorization: SHA256 Credential={appId},Timestamp={ts},Signature={sha256(appId+ts+payload+secret)}
 */

const API_URL = process.env.SHOPEE_API_URL || "https://open-api.affiliate.shopee.com.br/graphql";

export class ShopeeApiError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "ShopeeApiError";
    this.code = code;
  }
}

function getCredentials() {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_APP_SECRET;
  if (!appId || !secret) {
    throw new ShopeeApiError("Credenciais da Shopee ausentes: defina SHOPEE_APP_ID e SHOPEE_APP_SECRET no .env");
  }
  return { appId, secret };
}

export function buildSignature(appId: string, timestamp: number, payload: string, secret: string): string {
  return crypto.createHash("sha256").update(`${appId}${timestamp}${payload}${secret}`).digest("hex");
}

export async function shopeeGraphQL<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const { appId, secret } = getCredentials();
  // The exact same string must be signed and sent as body.
  const payload = JSON.stringify(variables ? { query, variables } : { query });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildSignature(appId, timestamp, payload, secret);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`,
    },
    body: payload,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ShopeeApiError(`Shopee API respondeu HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    const err = json.errors[0];
    throw new ShopeeApiError(err.extensions?.message || err.message || "Erro desconhecido da Shopee API", err.extensions?.code);
  }
  return json.data as T;
}

// ---------- Product offers ----------

export interface ShopeeProductOffer {
  itemId: number;
  shopId: number;
  productName: string;
  price: string;
  priceMin: string;
  priceMax: string;
  imageUrl: string;
  productLink: string;
  offerLink: string;
  commissionRate: string;
  commission: string;
  sales: number;
  ratingStar: string;
  priceDiscountRate: number;
  shopName: string;
}

export interface SearchOffersParams {
  keyword?: string;
  productCatId?: number;
  itemId?: string | number;
  shopId?: string | number;
  /** 1 = relevance, 2 = item sold (desc), 3 = price desc, 4 = price asc, 5 = commission desc */
  sortType?: number;
  page?: number;
  limit?: number;
}

export interface SearchOffersResult {
  nodes: ShopeeProductOffer[];
  pageInfo: { page: number; limit: number; hasNextPage: boolean };
}

const OFFER_FIELDS = `
  itemId shopId productName price priceMax imageUrl productLink offerLink
  sales ratingStar priceDiscountRate shopName
`;

const offerSearchCache = new Map<string, { result: SearchOffersResult; expiresAt: number }>();
const OFFER_CACHE_TTL_MS = 3 * 60 * 1000;

export async function searchProductOffers(params: SearchOffersParams): Promise<SearchOffersResult> {
  const query = `
    query ($keyword: String, $productCatId: Int, $itemId: Int64, $shopId: Int64, $sortType: Int, $page: Int, $limit: Int) {
      productOfferV2(keyword: $keyword, productCatId: $productCatId, itemId: $itemId, shopId: $shopId, sortType: $sortType, page: $page, limit: $limit) {
        nodes { ${OFFER_FIELDS} }
        pageInfo { page limit hasNextPage }
      }
    }
  `;

  const kw = params.keyword?.trim() || "";
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 20));
  const cacheKey = JSON.stringify({
    kw: kw.toLowerCase(),
    productCatId: params.productCatId,
    itemId: params.itemId,
    shopId: params.shopId,
    sortType: params.sortType,
    page,
    limit,
  });

  const cached = offerSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  let emptyResult: SearchOffersResult | null = null;
  let lastError: any = null;

  const attempt = async (term: string, sortType?: number): Promise<SearchOffersResult> => {
    const variables: Record<string, unknown> = { page, limit };
    if (sortType !== undefined) variables.sortType = sortType;
    if (term) variables.keyword = term;
    if (params.productCatId) variables.productCatId = params.productCatId;
    if (params.itemId !== undefined && params.itemId !== null) variables.itemId = String(params.itemId);
    if (params.shopId !== undefined && params.shopId !== null) variables.shopId = String(params.shopId);

    const data = await shopeeGraphQL<{ productOfferV2: SearchOffersResult }>(query, variables);
    const result = data?.productOfferV2;
    if (result?.nodes?.length) {
      return result;
    }
    if (result && !emptyResult) {
      emptyResult = result;
    }
    throw new ShopeeApiError("Sem resultados nesta tentativa");
  };

  const raceWave = async (tasks: Array<Promise<SearchOffersResult>>): Promise<SearchOffersResult | null> => {
    try {
      const winner = await Promise.any(tasks);
      offerSearchCache.set(cacheKey, { result: winner, expiresAt: Date.now() + OFFER_CACHE_TTL_MS });
      return winner;
    } catch (agg: any) {
      const errors = agg?.errors || [];
      for (const e of errors) {
        if (e && e.message !== "Sem resultados nesta tentativa") {
          lastError = e;
        }
      }
      return null;
    }
  };

  if (params.itemId !== undefined) {
    try {
      const res = await attempt(kw, params.sortType);
      offerSearchCache.set(cacheKey, { result: res, expiresAt: Date.now() + OFFER_CACHE_TTL_MS });
      return res;
    } catch (err) {
      if (err instanceof Error && err.message !== "Sem resultados nesta tentativa") lastError = err;
    }
  } else {
    // Ondas pequenas (máx 2 requisições por vez) para não estourar rate/burst limit da Shopee
    const altKw =
      kw.endsWith("s") && kw.length > 3
        ? kw.slice(0, -1)
        : kw && kw.length > 3
        ? kw + "s"
        : null;

    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const preferred = params.sortType;
    const wave1Sorts = preferred !== undefined
      ? [preferred, preferred === 5 ? 1 : 5]
      : [1, 5];

    // Onda 1: termo original com sort preferido (ex: 2) e fallback paralelo (5 ou 1)
    const wave1 = await raceWave(wave1Sorts.map((s) => attempt(kw, s)));
    if (wave1) return wave1;

    await pause(200);

    // Onda 2: demais sortTypes principais no termo original
    const remainingSorts = [1, 2, 3, 5].filter((s) => !wave1Sorts.includes(s));
    const wave2 = await raceWave(remainingSorts.slice(0, 2).map((s) => attempt(kw, s)));
    if (wave2) return wave2;

    if (altKw) {
      await pause(200);
      // Onda 3: variação singular/plural (ex: brocas/broca, fresa/fresas)
      const wave3 = await raceWave([attempt(altKw, 1), attempt(altKw, 5)]);
      if (wave3) return wave3;
    }

    await pause(250);

    // Onda 4: fallback final sem sort / variação
    const wave4 = await raceWave(
      altKw ? [attempt(kw, undefined), attempt(altKw, 2)] : [attempt(kw, undefined), attempt(kw, 3)]
    );
    if (wave4) return wave4;
  }

  if (emptyResult) return emptyResult;
  if (lastError) throw lastError;
  return { nodes: [], pageInfo: { page: 1, limit, hasNextPage: false } };
}

/** Fetches fresh data for a specific Shopee product by its itemId. Returns null if not found. */
export async function getProductOfferById(itemId: string | number): Promise<ShopeeProductOffer | null> {
  try {
    const res = await searchProductOffers({ itemId: String(itemId), limit: 1 });
    return res.nodes[0] || null;
  } catch (error) {
    console.error(`Erro ao buscar oferta Shopee para itemId ${itemId}:`, error);
    return null;
  }
}

// ---------- Short links ----------

export async function generateShortLink(originUrl: string): Promise<string> {
  const query = `mutation ($originUrl: String!) { generateShortLink(input: { originUrl: $originUrl }) { shortLink } }`;
  const data = await shopeeGraphQL<{ generateShortLink: { shortLink: string } }>(query, { originUrl });
  return data.generateShortLink.shortLink;
}

// ---------- Conversion Reports ----------

export interface ShopeeConversionItem {
  conversionId: string;
  clickTime: number;
  purchaseTime: number;
  conversionStatus: string;
  estimatedTotalCommission: string;
  totalCommission: string;
  netCommission: string;
  device?: string;
}

export interface ConversionReportResult {
  nodes: ShopeeConversionItem[];
  pageInfo: {
    page: number | null;
    limit: number;
    hasNextPage: boolean;
    scrollId: string;
  };
}

export interface ConversionReportParams {
  purchaseTimeStart?: number; // unix timestamp in seconds
  purchaseTimeEnd?: number;   // unix timestamp in seconds
  limit?: number;
  scrollId?: string;
}

export async function getConversionReport(params: ConversionReportParams): Promise<ConversionReportResult> {
  const scrollVarDef = params.scrollId ? ", $scrollId: String" : "";
  const scrollArg = params.scrollId ? ", scrollId: $scrollId" : "";

  const query = `
    query ($purchaseTimeStart: Int64, $purchaseTimeEnd: Int64, $limit: Int${scrollVarDef}) {
      conversionReport(purchaseTimeStart: $purchaseTimeStart, purchaseTimeEnd: $purchaseTimeEnd, limit: $limit${scrollArg}) {
        nodes {
          conversionId
          clickTime
          purchaseTime
          conversionStatus
          estimatedTotalCommission
          totalCommission
          netCommission
          device
        }
        pageInfo {
          page
          limit
          hasNextPage
          scrollId
        }
      }
    }
  `;

  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 3600;

  const variables: Record<string, unknown> = {
    purchaseTimeStart: String(params.purchaseTimeStart ?? thirtyDaysAgo),
    purchaseTimeEnd: String(params.purchaseTimeEnd ?? now),
    limit: Math.min(100, Math.max(1, params.limit ?? 20)),
  };

  if (params.scrollId) variables.scrollId = params.scrollId;

  const data = await shopeeGraphQL<{ conversionReport: ConversionReportResult }>(query, variables);
  return data.conversionReport;
}

// ---------- Mapping helpers ----------

export function slugify(text: string, maxLen = 40): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
}

// ---------- Live Shopee Flash Sale Scraping ----------

export interface FlashSaleItemData {
  itemId: string;
  shopId: string;
  name: string;
  price: number;
  originalPrice: number;
  discountRate: number;
  imageUrl: string;
  sales: number;
  productUrl: string;
  promotionId: string;
}

const SHOPEE_FLASH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Referer": "https://shopee.com.br/flash_sale",
  "x-api-source": "pc",
};

/** Obtém as sessões ativas e do dia das Ofertas Relâmpago da Shopee */
export async function fetchShopeeFlashSaleSessions() {
  const url = "https://shopee.com.br/api/v4/flash_sale/get_all_sessions";
  const res = await fetch(url, { headers: SHOPEE_FLASH_HEADERS });
  if (!res.ok) throw new Error(`Falha ao obter sessões de oferta relâmpago: HTTP ${res.status}`);
  const json = await res.json();
  const sessions = json.data?.sessions || [];
  const ongoing = sessions.find((s: any) => s.is_ongoing) || sessions[0] || null;
  return {
    sessions,
    ongoingSession: ongoing,
    currentPromotionId: ongoing?.promotionid ? String(ongoing.promotionid) : null,
  };
}

/** Puxa os produtos oficiais diretamente da página de Ofertas Relâmpago da Shopee */
export async function fetchShopeeFlashSaleItems(promotionId: string, limit = 40): Promise<FlashSaleItemData[]> {
  const url = `https://shopee.com.br/api/v4/flash_sale/flash_sale_get_items?promotionid=${promotionId}&categoryid=0&limit=${limit}&sort_soldout=true`;
  const res = await fetch(url, { headers: SHOPEE_FLASH_HEADERS });
  if (!res.ok) throw new Error(`Falha ao buscar itens da oferta relâmpago: HTTP ${res.status}`);
  const json = await res.json();
  const rawItems = json.data?.items || [];

  return rawItems.map((item: any) => {
    const rawPrice = item.price ? Number(item.price) / 100000 : 0;
    const rawBefore = item.price_before_discount ? Number(item.price_before_discount) / 100000 : rawPrice;
    const discount = item.raw_discount || (rawBefore > rawPrice ? Math.round(((rawBefore - rawPrice) / rawBefore) * 100) : 0);
    const imgName = item.image || item.images?.[0] || "";
    const imageUrl = imgName.startsWith("http") ? imgName : `https://down-br.img.susercontent.com/file/${imgName}`;

    return {
      itemId: String(item.itemid),
      shopId: String(item.shopid),
      name: (item.name || "").trim(),
      price: Math.round(rawPrice * 100) / 100,
      originalPrice: Math.round(rawBefore * 100) / 100,
      discountRate: discount,
      imageUrl,
      sales: item.historical_sold || item.flash_sale_stock || 100,
      productUrl: `https://shopee.com.br/product/${item.shopid}/${item.itemid}`,
      promotionId,
    };
  });
}

/** Converts an API offer into the shape stored in prisma.product (without categoryId). */
export function offerToProductData(offer: ShopeeProductOffer) {
  const name = offer.productName.trim();
  const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const price = parseFloat(offer.priceMin || offer.price) || 0;
  return {
    name,
    slug: `${slugify(name)}-${uniqueSuffix}`,
    description: `Oferta imperdível: ${name}. Garanta o melhor preço e procedência na Shopee pelo Achadinhos do Dia!`,
    price,
    affiliateLink: offer.offerLink,
    imageUrl: offer.imageUrl,
    itemId: String(offer.itemId),
    shopId: String(offer.shopId),
    commissionRate: parseFloat(offer.commissionRate) || null,
    sales: typeof offer.sales === "number" ? offer.sales : null,
    ratingStar: parseFloat(offer.ratingStar) || null,
    discountRate: typeof offer.priceDiscountRate === "number" ? offer.priceDiscountRate : null,
    priceUpdatedAt: new Date(),
  };
}
