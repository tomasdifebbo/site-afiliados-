import { formatBRLValue } from "./priceFormat";

interface PriceCompareProps {
  slug: string;
  origin: string;
  shopeePrice: number;
  mlPrice: number;
  size?: "card" | "large";
  shopeeDirectUrl?: string;
  mlDirectUrl?: string;
  productName?: string;
}

/** Dois botões lado a lado (Shopee x Mercado Livre) com selo "Mais barato" no menor preço. */
export default function PriceCompare({
  slug,
  origin,
  shopeePrice,
  mlPrice,
  size = "card",
  shopeeDirectUrl,
  mlDirectUrl,
  productName,
}: PriceCompareProps) {
  const shopeeCheaper = shopeePrice <= mlPrice;
  const diff = Math.abs(shopeePrice - mlPrice);
  const pct = Math.round((diff / Math.max(shopeePrice, mlPrice)) * 100);

  const shopeeHref = shopeeDirectUrl || `/go/${slug}?origin=${origin}`;
  const mlHref =
    mlDirectUrl ||
    `/go-ml/${slug}?origin=${origin}${productName ? `&q=${encodeURIComponent(productName)}` : ""}`;

  return (
    <div className={`price-compare ${size === "large" ? "price-compare-lg" : ""}`}>
      <a
        href={shopeeHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`pc-option pc-shopee ${shopeeCheaper ? "pc-best" : ""}`}
        title="Ver oferta na Shopee"
      >
        {shopeeCheaper && <span className="pc-badge">Mais barato</span>}
        <span className="pc-store">Shopee</span>
        <span className="pc-price">R$ {formatBRLValue(shopeePrice)}</span>
      </a>
      <a
        href={mlHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`pc-option pc-ml ${!shopeeCheaper ? "pc-best" : ""}`}
        title="Ver oferta no Mercado Livre"
      >
        {!shopeeCheaper && <span className="pc-badge">Mais barato</span>}
        <span className="pc-store">Mercado Livre</span>
        <span className="pc-price">R$ {formatBRLValue(mlPrice)}</span>
      </a>
      {diff >= 0.5 && (
        <div className="pc-saving">
          Economize R$ {formatBRLValue(diff)} ({pct}%) {shopeeCheaper ? "na Shopee" : "no Mercado Livre"}
        </div>
      )}
    </div>
  );
}
