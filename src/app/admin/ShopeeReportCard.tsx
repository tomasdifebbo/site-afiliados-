"use client";

import { useState, useEffect } from "react";
import { DollarSign, ShoppingCart, MousePointer, TrendingUp, RefreshCw, AlertCircle, CheckCircle, Sparkles } from "lucide-react";

export function ShopeeReportCard() {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (d: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/shopee/report?days=${d}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao carregar relatório");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Falha ao obter relatório");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(days);
  }, [days]);

  return (
    <div
      className="glass"
      style={{
        padding: "2rem",
        borderRadius: "32px",
        marginBottom: "3rem",
        backgroundColor: "#fff",
        border: "1px solid rgba(234, 88, 12, 0.15)",
        boxShadow: "0 10px 30px -10px rgba(234, 88, 12, 0.1)",
      }}
    >
      {/* Header com Seletor */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              padding: "10px",
              borderRadius: "14px",
              background: "#ea580c",
              color: "#fff",
              display: "flex",
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#000" }}>
              Desempenho Shopee Affiliate
            </h2>
            <p style={{ color: "#666", fontSize: "0.875rem", margin: 0, fontWeight: 500 }}>
              Métricas oficiais da Open API Shopee em tempo real.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: "6px 14px",
                borderRadius: "12px",
                fontSize: "0.85rem",
                fontWeight: 700,
                border: "1px solid",
                borderColor: days === d ? "#ea580c" : "#e5e7eb",
                backgroundColor: days === d ? "#fff7ed" : "#fff",
                color: days === d ? "#ea580c" : "#4b5563",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Últimos {d} dias
            </button>
          ))}
          <button
            onClick={() => fetchReport(days)}
            disabled={loading}
            style={{
              padding: "8px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#fff",
              color: "#6b7280",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            title="Recarregar dados"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            padding: "1rem",
            borderRadius: "14px",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      ) : null}

      {/* Grid de Métricas Principais */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {/* Comissão Estimada */}
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "20px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
              Comissão Estimada
            </span>
            <div style={{ color: "#16a34a" }}><DollarSign size={20} /></div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#14532d" }}>
            R$ {data?.metrics?.totalEstimatedCommission?.toFixed(2) ?? "0,00"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: 600, marginTop: "4px" }}>
            Confirmada: R$ {data?.metrics?.totalConfirmedCommission?.toFixed(2) ?? "0,00"}
          </div>
        </div>

        {/* Total de Pedidos Shopee */}
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "20px",
            backgroundColor: "#fff7ed",
            border: "1px solid #fed7aa",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#9a3412", textTransform: "uppercase" }}>
              Vendas Shopee
            </span>
            <div style={{ color: "#ea580c" }}><ShoppingCart size={20} /></div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#7c2d12" }}>
            {data?.metrics?.totalOrders ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9a3412", fontWeight: 600, marginTop: "4px" }}>
            Pedidos gerados na Shopee
          </div>
        </div>

        {/* Cliques Registrados */}
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "20px",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
              Cliques no Catálogo
            </span>
            <div style={{ color: "#2563eb" }}><MousePointer size={20} /></div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#1e3a8a" }}>
            {data?.metrics?.totalClicks?.toLocaleString("pt-BR") ?? 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#1d4ed8", fontWeight: 600, marginTop: "4px" }}>
            Últimos {days} dias no seu site
          </div>
        </div>

        {/* Taxa de Conversão */}
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "20px",
            backgroundColor: "#faf5ff",
            border: "1px solid #e9d5ff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#6b21a8", textTransform: "uppercase" }}>
              Taxa de Conversão
            </span>
            <div style={{ color: "#9333ea" }}><TrendingUp size={20} /></div>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#581c87" }}>
            {data?.metrics?.conversionRatePercent ?? "0.00"}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "#7e22ce", fontWeight: 600, marginTop: "4px" }}>
            Cliques convertidos em vendas
          </div>
        </div>
      </div>

      {/* Top Produtos com mais cliques e comissão */}
      {data?.topClickedProducts && data.topClickedProducts.length > 0 && (
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "1rem", color: "#111" }}>
            Top Ofertas Mais Clicadas no Período
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.topClickedProducts.map((p: any) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1.25rem",
                  borderRadius: "14px",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #f3f4f6",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "420px",
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#666" }}>
                      R$ {p.price.toFixed(2)}
                      {p.commissionRate ? ` • ${(p.commissionRate * 100).toFixed(1)}% comissão` : ""}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: "12px" }}>
                  <span style={{ fontWeight: 800, color: "#ea580c", fontSize: "0.95rem" }}>
                    {p.clicks} cliques
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
