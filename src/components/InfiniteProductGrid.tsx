"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ShoppingBag, Loader2, RefreshCw, Sparkles, Flame, Star, Tag, AlertCircle } from "lucide-react";

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  imageUrl: string;
  discountRate?: number | null;
  sales?: number | null;
  ratingStar?: number | null;
  category?: {
    name: string;
    slug: string;
  };
}

interface InfiniteProductGridProps {
  initialProducts: ProductItem[];
  initialTotal: number;
  categorySlug?: string;
  featuredOnly?: boolean;
  limit?: number;
}

function SkeletonCard() {
  return (
    <div className="product-card" style={{ boxShadow: "0 8px 20px rgba(0,0,0,0.03)" }}>
      <div
        style={{
          width: "100%",
          aspectRatio: "1/1",
          backgroundColor: "#f0f2f5",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div className="product-card-body" style={{ gap: "0.6rem" }}>
        <div style={{ height: "10px", width: "40%", backgroundColor: "#e2e8f0", borderRadius: "6px" }} />
        <div style={{ height: "16px", width: "90%", backgroundColor: "#e2e8f0", borderRadius: "6px" }} />
        <div style={{ height: "16px", width: "65%", backgroundColor: "#e2e8f0", borderRadius: "6px" }} />
        <div className="product-card-bottom">
          <div style={{ height: "20px", width: "70px", backgroundColor: "#e2e8f0", borderRadius: "6px" }} />
          <div style={{ height: "34px", width: "100%", backgroundColor: "#e2e8f0", borderRadius: "10px" }} />
        </div>
      </div>
    </div>
  );
}

export default function InfiniteProductGrid({
  initialProducts = [],
  initialTotal = 0,
  categorySlug,
  featuredOnly = false,
  limit = 12,
}: InfiniteProductGridProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(initialTotal);
  const [sort, setSort] = useState<string>("recent");
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(initialTotal > initialProducts.length);
  const [error, setError] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Sync state if category changes
  useEffect(() => {
    setProducts(initialProducts);
    setTotal(initialTotal);
    setPage(1);
    setSort("recent");
    setHasMore(initialTotal > initialProducts.length);
  }, [categorySlug, initialTotal, initialProducts]);

  // Handle Sort Change (reloads from page 1 with new sort)
  const handleSortChange = async (newSort: string) => {
    if (newSort === sort || loading) return;
    setSort(newSort);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: "1",
        limit: String(limit),
        sort: newSort,
      });

      if (categorySlug) params.append("categorySlug", categorySlug);
      if (featuredOnly) params.append("featured", "true");

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao ordenar produtos.");

      const data = await res.json();
      const newItems: ProductItem[] = data.products || [];

      setProducts(newItems);
      setPage(1);
      setTotal(data.total ?? total);
      setHasMore(data.hasMore ?? false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao ordenar produtos.");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
        sort,
      });

      if (categorySlug) params.append("categorySlug", categorySlug);
      if (featuredOnly) params.append("featured", "true");

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao carregar novos produtos.");

      const data = await res.json();
      const newItems: ProductItem[] = data.products || [];

      setProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const filteredNew = newItems.filter((p) => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });

      setPage(nextPage);
      setTotal(data.total ?? total);
      setHasMore(data.hasMore ?? false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar mais itens.");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, limit, categorySlug, featuredOnly, sort, total]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!hasMore || loading) return;

    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        threshold: 0,
        rootMargin: "350px",
      }
    );

    observer.observe(currentTarget);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const formatSales = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`.replace(".0", "k");
    }
    return `${count}`;
  };

  const formatBRL = (val?: number | null) => {
    if (val == null || val <= 0) return null;
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Barra de Filtros e Ordenação Inteligente */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "1.75rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>
          Mostrando <strong style={{ color: "#0f172a" }}>{products.length}</strong> de{" "}
          <strong style={{ color: "#0f172a" }}>{total.toLocaleString("pt-BR")}</strong> achadinhos
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { id: "recent", label: "Recentes", icon: Sparkles },
            { id: "best_sales", label: "Mais Vendidos", icon: Flame },
            { id: "best_rating", label: "Melhores Notas", icon: Star },
            { id: "best_discount", label: "Maiores Descontos", icon: Tag },
          ].map((item) => {
            const Icon = item.icon;
            const active = sort === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSortChange(item.id)}
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "100px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  border: "1px solid",
                  borderColor: active ? "hsl(var(--primary))" : "#e2e8f0",
                  backgroundColor: active ? "hsl(var(--primary))" : "#fff",
                  color: active ? "#fff" : "#475569",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: active ? "0 4px 12px rgba(255,102,0,0.25)" : "none",
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      <div className="product-grid" style={{ marginBottom: "2.5rem" }}>
        {products.map((product, idx) => (
          <div
            key={`${product.id}-${idx}`}
            className="product-card glass shadow-premium"
          >
            {/* Image Container */}
            <a
              href={`/produto/${product.slug}`}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1/1",
                backgroundColor: "#f8f9fa",
                display: "block",
                overflow: "hidden",
              }}
            >
              <img
                src={product.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop"}
                alt={product.name}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 0.4s ease",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop";
                }}
              />

              {/* Selo de Oferta */}
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "8px",
                  backgroundColor: "hsl(var(--primary))",
                  color: "#fff",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "0.65rem",
                  fontWeight: 900,
                  letterSpacing: "0.5px",
                  boxShadow: "0 4px 10px rgba(255,102,0,0.3)",
                }}
              >
                OFERTA
              </div>

              {/* Selo de Desconto Oficial */}
              {product.discountRate ? (
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "0.65rem",
                    fontWeight: 900,
                    letterSpacing: "0.5px",
                    boxShadow: "0 4px 10px rgba(239,68,68,0.35)",
                  }}
                >
                  -{product.discountRate}% OFF
                </div>
              ) : null}
            </a>

            {/* Info */}
            <div className="product-card-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                {product.category?.name ? (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "hsl(var(--muted-foreground))",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: 800,
                    }}
                  >
                    {product.category.name}
                  </span>
                ) : <span />}

                {/* Nota de Avaliação ⭐ */}
                {product.ratingStar ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: "#b45309",
                      backgroundColor: "#fef3c7",
                      padding: "2px 6px",
                      borderRadius: "6px",
                    }}
                  >
                    <Star size={11} fill="#f59e0b" color="#f59e0b" />
                    {product.ratingStar.toFixed(1)}
                  </span>
                ) : null}
              </div>

              <h3 className="product-card-title">
                <a href={`/produto/${product.slug}`} style={{ color: "#111" }}>
                  {product.name}
                </a>
              </h3>

              {/* Volume de Vendas 🔥 */}
              {product.sales ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#ea580c",
                    marginBottom: "0.4rem",
                  }}
                >
                  <Flame size={12} />
                  <span>{formatSales(product.sales)} vendidos na Shopee</span>
                </div>
              ) : null}

              <div className="product-card-bottom">
                <div className="product-card-price-block">
                  {product.discountRate && product.discountRate > 0 && product.price ? (
                    <span className="product-card-old-price">
                      R$ {formatBRL(product.price / (1 - product.discountRate / 100))}
                    </span>
                  ) : (
                    <span className="product-card-price-label">Melhor Preço</span>
                  )}
                  <div className="product-card-price">
                    {product.price && product.price > 0 ? (
                      <>
                        <span className="product-card-currency">R$</span>
                        <span>{formatBRL(product.price)}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.95rem" }}>Ver Preço</span>
                    )}
                  </div>
                </div>

                <a
                  href={`/go/${product.slug}?origin=${categorySlug || "grid"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="product-card-btn btn btn-primary"
                  title="Ver oferta oficial na Shopee"
                >
                  <span>Ver Oferta</span>
                  <ShoppingBag size={14} />
                </a>
              </div>
            </div>
          </div>
        ))}

        {/* Skeleton Loaders while fetching next batch */}
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
      </div>

      {/* Infinite Scroll Trigger & Bottom States */}
      <div
        ref={observerTarget}
        style={{
          width: "100%",
          padding: "2rem 0 4rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "hsl(var(--primary))",
              fontWeight: 700,
              fontSize: "0.95rem",
            }}
          >
            <Loader2 className="animate-spin" size={24} />
            <span>Buscando mais achadinhos para você...</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "1rem 1.5rem",
              borderRadius: "16px",
              backgroundColor: "#fee2e2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
            <button
              onClick={loadMore}
              style={{
                marginLeft: "auto",
                backgroundColor: "#fff",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                padding: "6px 12px",
                fontWeight: 700,
                color: "#991b1b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={14} /> Tentar de novo
            </button>
          </div>
        )}

        {!hasMore && products.length > 0 && !loading && (
          <div
            style={{
              textAlign: "center",
              color: "#64748b",
              fontSize: "0.9rem",
              fontWeight: 600,
              padding: "2rem 1rem",
              borderTop: "1px dashed #e2e8f0",
              width: "100%",
              maxWidth: "600px",
            }}
          >
            <Sparkles size={20} style={{ margin: "0 auto 8px", color: "hsl(var(--primary))" }} />
            <div>Você já viu todos os <strong>{total.toLocaleString("pt-BR")}</strong> achadinhos disponíveis!</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
              Volte em breve para conferir novas ofertas exclusivas.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
