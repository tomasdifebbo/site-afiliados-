"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingBag, Star, Loader2, ExternalLink, ChevronDown, CheckCircle2 } from "lucide-react";
import { ShopeeSearchBar } from "@/components/ShopeeSearchBar";
import PriceCompare from "@/components/PriceCompare";

interface LiveShopeeProduct {
  id: string;
  itemId: string;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number | null;
  discountRate?: number | null;
  imageUrl: string;
  affiliateLink: string;
  mlPrice?: number | null;
  mlLink?: string | null;
  sales: number;
  ratingStar: number;
  shopName: string;
}

export default function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const [products, setProducts] = useState<LiveShopeeProduct[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // 1. Busca inicial da página 1 ao pesquisar ou mudar a busca
  useEffect(() => {
    if (!q.trim()) {
      setProducts([]);
      setHasNextPage(false);
      return;
    }

    let isMounted = true;
    const fetchPage1 = async () => {
      setLoadingInitial(true);
      setError("");
      setPage(1);
      setHasNextPage(true);

      try {
        const res = await fetch(`/api/shopee/live-search?q=${encodeURIComponent(q.trim())}&page=1&limit=24`);
        const data = await res.json();
        if (!isMounted) return;

        if (data.success) {
          setProducts(data.products || []);
          setHasNextPage(Boolean(data.pageInfo?.hasNextPage));
        } else {
          setError(data.error || "Não foi possível carregar os resultados.");
        }
      } catch {
        if (isMounted) setError("Erro ao se conectar com a Shopee.");
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    };

    fetchPage1();
    return () => { isMounted = false; };
  }, [q]);

  // 2. Carrega a próxima página conforme o usuário rola a tela
  const loadMore = useCallback(async () => {
    if (loadingInitial || loadingMore || !hasNextPage || !q.trim()) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const res = await fetch(`/api/shopee/live-search?q=${encodeURIComponent(q.trim())}&page=${nextPage}&limit=24`);
      const data = await res.json();

      if (data.success && Array.isArray(data.products)) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = data.products.filter((p: LiveShopeeProduct) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasNextPage(Boolean(data.pageInfo?.hasNextPage));
      } else {
        setHasNextPage(false);
      }
    } catch {
      // Em caso de instabilidade, mantém o estado para permitir nova tentativa
    } finally {
      setLoadingMore(false);
    }
  }, [loadingInitial, loadingMore, hasNextPage, page, q]);

  // 3. IntersectionObserver para rolagem infinita automática ao chegar perto do fim da página
  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "500px 0px" } // Dispara 500px antes do fim para rolagem contínua e sem paradas
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const formatBRL = (val?: number | null) => {
    if (!val) return "Consulte";
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ backgroundColor: "#f5f5f5", minHeight: "100vh", padding: "2rem 0 5rem 0" }}>
      <div className="container">
        {/* Barra de Busca Topo */}
        <div style={{ marginBottom: "2rem" }}>
          <ShopeeSearchBar initialQuery={q} />
        </div>

        {/* Cabeçalho de Resultados */}
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 900, color: "#0f172a", margin: "0 0 4px 0" }}>
              {q ? (
                <>Resultados para <span style={{ color: "#FF5722" }}>&ldquo;{q}&rdquo;</span> direto da Shopee</>
              ) : (
                "Busca Direta na Shopee"
              )}
            </h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Produtos atualizados em tempo real com links oficiais de afiliados com desconto. Role para baixo para ver mais!
            </p>
          </div>

          {products.length > 0 && (
            <div style={{ fontSize: "0.82rem", background: "#fff", padding: "6px 14px", borderRadius: "100px", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
              ⚡ {products.length} ofertas carregadas {hasNextPage ? "(rolagem contínua ativa)" : ""}
            </div>
          )}
        </div>

        {/* Loading Inicial */}
        {loadingInitial && (
          <div style={{ textAlign: "center", padding: "5rem 1rem", background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <Loader2 size={40} className="animate-spin" style={{ color: "#FF5722", margin: "0 auto 14px auto" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 6px 0" }}>
              Buscando na Shopee e gerando seus links de desconto...
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Consultando os produtos mais vendidos e com melhor avaliação para você.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loadingInitial && error && (
          <div style={{ textAlign: "center", padding: "4rem 1rem", background: "#fef2f2", borderRadius: "16px", border: "1px solid #fecaca", color: "#991b1b" }}>
            <p style={{ fontWeight: 700, margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingInitial && !error && q && products.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 1rem", background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <ShoppingBag size={48} style={{ color: "#94a3b8", margin: "0 auto 12px auto" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", marginBottom: "6px" }}>
              Nenhum produto encontrado para &ldquo;{q}&rdquo;
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Tente buscar por termos mais genéricos, como &ldquo;relogio&rdquo;, &ldquo;fone&rdquo; ou &ldquo;luminaria&rdquo;.
            </p>
          </div>
        )}

        {/* Grid de Produtos */}
        {!loadingInitial && products.length > 0 && (
          <div className="product-grid">
            {products.map((item) => {
              const salesStr = item.sales >= 1000 ? `${(item.sales / 1000).toFixed(1)} mil` : String(item.sales);
              return (
                <div
                  key={item.id}
                  className="product-card"
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Foto do Produto */}
                  <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", backgroundColor: "#f8fafc", overflow: "hidden" }}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />

                    {/* Badge Desconto */}
                    {item.discountRate && item.discountRate > 0 && (
                      <span className="product-card-badge-right" style={{ background: "#FF5722", color: "#fff", fontWeight: 800 }}>
                        -{item.discountRate}%
                      </span>
                    )}

                    <span className="product-card-badge-left" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>
                      Shopee Oficial
                    </span>
                  </div>

                  {/* Detalhes */}
                  <div className="product-card-body" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      {/* Vendas e Avaliação */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "#64748b", marginBottom: "6px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", color: "#f59e0b", fontWeight: 700 }}>
                          <Star size={11} fill="#f59e0b" style={{ marginRight: "2px" }} />
                          {item.ratingStar.toFixed(1)}
                        </span>
                        {item.sales > 0 && <span>• {salesStr} vendidos</span>}
                      </div>

                      {/* Nome */}
                      <h3
                        className="product-card-title"
                        title={item.name}
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          lineHeight: 1.4,
                          color: "#1e293b",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          marginBottom: "8px",
                        }}
                      >
                        {item.name}
                      </h3>
                    </div>

                    {/* Preço e Comparador / Botão */}
                    {item.mlPrice && item.mlLink && item.price > 0 ? (
                      <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
                        <PriceCompare
                          slug={item.slug || item.itemId}
                          origin="search"
                          shopeePrice={item.price}
                          mlPrice={item.mlPrice}
                          shopeeDirectUrl={item.affiliateLink || undefined}
                          mlDirectUrl={item.mlLink || undefined}
                        />
                      </div>
                    ) : (
                    <div className="product-card-bottom" style={{ marginTop: "auto" }}>
                      <div className="product-card-price-block">
                        <div className="product-card-price-header">
                          {item.originalPrice && item.originalPrice > item.price ? (
                            <span className="product-card-old-price">
                              De R$ {formatBRL(item.originalPrice)}
                            </span>
                          ) : (
                            <span className="product-card-price-label">Melhor Preço</span>
                          )}

                          {item.discountRate && item.discountRate > 0 ? (
                            <span className="product-card-discount-pill">
                              -{item.discountRate}% OFF
                            </span>
                          ) : null}
                        </div>

                        <div className="product-card-price">
                          <span className="product-card-currency">R$</span>
                          <span className="product-card-price-value" style={{ fontSize: "1.25rem", fontWeight: 900, color: "#FF5722" }}>
                            {formatBRL(item.price)}
                          </span>
                        </div>
                      </div>

                      <a
                        href={item.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="product-card-btn"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          background: "linear-gradient(135deg, #FF5722 0%, #FF7A00 100%)",
                          color: "#fff",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          textDecoration: "none",
                          boxShadow: "0 2px 8px rgba(255,87,34,0.3)",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        Ver na Shopee <ExternalLink size={14} />
                      </a>
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading Mais Produtos (Infinite Scroll) */}
        {loadingMore && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", marginTop: "1.5rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#fff", padding: "10px 24px", borderRadius: "100px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
              <Loader2 size={18} className="animate-spin" style={{ color: "#FF5722" }} />
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>
                Carregando mais produtos da Shopee...
              </span>
            </div>
          </div>
        )}

        {/* Sentinel para o IntersectionObserver disparar a próxima página */}
        <div ref={observerRef} style={{ height: "40px", marginTop: "10px" }} />

        {/* Botão de fallback caso queira carregar manualmente */}
        {!loadingInitial && !loadingMore && hasNextPage && products.length > 0 && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button
              onClick={loadMore}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#fff",
                color: "#FF5722",
                border: "2px solid #FF5722",
                borderRadius: "100px",
                padding: "10px 28px",
                fontSize: "0.9rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(255,87,34,0.12)",
                transition: "all 0.2s ease",
              }}
            >
              <span>Carregar Mais Produtos</span>
              <ChevronDown size={18} />
            </button>
          </div>
        )}

        {/* Fim dos resultados */}
        {!loadingInitial && !hasNextPage && products.length > 0 && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b", fontSize: "0.9rem", fontWeight: 600 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px 20px", borderRadius: "100px", border: "1px solid #e2e8f0" }}>
              <CheckCircle2 size={16} style={{ color: "#10b981" }} />
              <span>Você viu todas as ofertas disponíveis para &ldquo;{q}&rdquo;!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
