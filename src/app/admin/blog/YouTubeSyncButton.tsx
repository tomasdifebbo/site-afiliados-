"use client";

import { useState } from "react";
import { Video, RefreshCw, CheckCircle2, AlertCircle, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

export function YouTubeSyncButton() {
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("achadinhos da shopee");
  const [limit, setLimit] = useState(3);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    postsCreated?: number;
    totalMatchedProducts?: number;
  } | null>(null);

  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/blog/youtube-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro na sincronização");
      }

      setResult({
        success: true,
        message: data.message,
        postsCreated: data.postsCreated,
        totalMatchedProducts: data.totalMatchedProducts,
      });

      router.refresh();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Falha ao sincronizar vídeos do YouTube",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "1.5rem", marginBottom: "2.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Video size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Automação YouTube ➔ Blog & Shopee
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
              Busca vídeos de achadinhos, identifica os produtos e cria artigos com links de afiliado.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Palavra-chave (ex: achadinhos da shopee)"
            style={{ padding: "0.6rem 1rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem", minWidth: "220px" }}
          />

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ padding: "0.6rem 0.8rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem", backgroundColor: "#fff" }}
          >
            <option value={1}>1 vídeo</option>
            <option value={3}>3 vídeos</option>
            <option value={5}>5 vídeos</option>
          </select>

          <button
            onClick={handleSync}
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: "0.65rem 1.4rem",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: loading ? "#94a3b8" : "#FF5722",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            {loading ? "Processando YouTube & Shopee..." : "Sincronizar Agora"}
          </button>
        </div>
      </div>

      {result && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.85rem 1.25rem",
            borderRadius: "12px",
            backgroundColor: result.success ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`,
            color: result.success ? "#166534" : "#991b1b",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {result.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
