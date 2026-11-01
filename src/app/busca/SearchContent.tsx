"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShoppingBag, Star, Loader2, ExternalLink } from "lucide-react";
import { ShopeeSearchBar } from "@/components/ShopeeSearchBar";

interface LiveShopeeProduct {
  id: string;
  itemId: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  discountRate?: number | null;
  imageUrl: string;
  affiliateLink: string;
  sales: number;
  ratingStar: number;
  shopName: string;
}

export default function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const [products, setProducts] = useState<LiveShopeeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!q.trim()) return;

    const fetchLiveShopee = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/shopee/live-search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (data.success) {
          setProducts(data.products || []);
        } else {
          setError(data.error || "Não foi possível carregar os resultados.");
        }
      } catch (err: any) {
        setError("Erro ao se conectar com a Shopee.");
      } finally {
        setLoading(false);
      }
    };

    fetchLiveShopee();
  }, [q]);

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
              Produtos atualizados em tempo real com links oficiais de afiliados com desconto.
            </p>
          </div>

          {products.length > 0 && (
            <div style={{ fontSize: "0.82rem", background: "#fff", padding: "6px 14px", borderRadius: "100px", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
              ⚡ {products.length} ofertas encontradas
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
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
        {!loading && error && (
          <div style={{ textAlign: "center", padding: "4rem 1rem", background: "#fef2f2", borderRadius: "16px", border: "1px solid #fecaca", color: "#991b1b" }}>
            <p style={{ fontWeight: 700, margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && q && products.length === 0 && (
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
        {!loading && products.length > 0 && (
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

                    {/* Preço e Botão */}
                    <div className="product-card-bottom" style={{ marginTop: "10px" }}>
                      <div className="product-card-price-block">
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="product-card-old-price">
                            R$ {formatBRL(item.originalPrice)}
                          </span>
                        )}
                        <div style={{ display: "flex", alignItems: "baseline" }}>
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
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          textDecoration: "none",
                          boxShadow: "0 2px 8px rgba(255,87,34,0.3)",
                        }}
                      >
                        Ver na Shopee <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
