"use client";

import { useState } from "react";
import { RefreshCw, Link2, CheckCircle2, AlertCircle, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export function ShopeeSyncBar() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncingFlash, setSyncingFlash] = useState(false);
  const [matching, setMatching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const handleSyncFlashDeals = async () => {
    const inputUrl = prompt(
      "Cole o link da página de Ofertas Relâmpago da Shopee (ou deixe vazio para puxar a sessão ao vivo de agora):",
      "https://shopee.com.br/flash_sale?promotionId=514572205371541"
    );
    if (inputUrl === null) return;

    try {
      setSyncingFlash(true);
      setMessage(null);

      const res = await fetch("/api/admin/shopee/sync-flash-deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl.trim() || undefined, limit: 30 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao sincronizar ofertas relâmpago");

      setMessage({
        type: "success",
        text: `⚡ ${data.message}`,
      });
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha na sincronização de ofertas relâmpago" });
    } finally {
      setSyncingFlash(false);
    }
  };

  const handleSyncPrices = async () => {
    try {
      setSyncing(true);
      setMessage(null);

      const res = await fetch("/api/admin/shopee/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 30 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao sincronizar preços");

      if (data.total === 0) {
        setMessage({
          type: "info",
          text: "Nenhum produto com ID Shopee encontrado ainda para sincronizar. Dica: Use o botão 'Vincular Legados' ou importe novos produtos via API na aba Importar.",
        });
      } else {
        setMessage({
          type: "success",
          text: `Sincronização concluída! ${data.total} produtos verificados: ${data.updated} tiveram preços atualizados, ${data.unchanged} sem alteração e ${data.unavailable} esgotados.`,
        });
        router.refresh();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha na sincronização" });
    } finally {
      setSyncing(false);
    }
  };

  const handleMatchLegacy = async () => {
    try {
      setMatching(true);
      setMessage(null);

      const res = await fetch("/api/admin/shopee/match-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao vincular produtos legados");

      if (data.matched > 0) {
        setMessage({
          type: "success",
          text: `Sucesso! ${data.matched} de ${data.total} produtos antigos foram vinculados à Shopee API com comissões e ID oficial!`,
        });
        router.refresh();
      } else {
        setMessage({
          type: "info",
          text: `Nenhuma correspondência exata encontrada para os ${data.total} produtos testados.`,
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falha na vinculação" });
    } finally {
      setMatching(false);
    }
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 1.5rem",
          background: "linear-gradient(135deg, #fff7ed 0%, #fff 100%)",
          border: "1px solid #fed7aa",
          borderRadius: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "#ea580c",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#9a3412" }}>
              Automação Shopee Open API
            </div>
            <div style={{ fontSize: "0.85rem", color: "#7c2d12" }}>
              Mantenha preços, taxas de comissão e estoque 100% atualizados direto da Shopee.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleSyncFlashDeals}
            disabled={syncingFlash || syncing || matching}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 1.4rem",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
              border: "none",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: syncingFlash || syncing || matching ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.35)",
            }}
          >
            <Zap size={16} className={syncingFlash ? "animate-spin" : ""} />
            {syncingFlash ? "Sincronizando Ofertas do Dia..." : "⚡ Sincronizar Ofertas Relâmpago"}
          </button>

          <button
            onClick={handleMatchLegacy}
            disabled={matching || syncing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 1.25rem",
              borderRadius: "14px",
              background: "#fff",
              border: "1px solid #fdba74",
              color: "#9a3412",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: matching || syncing ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            <Link2 size={16} />
            {matching ? "Vinculando..." : "Vincular Produtos Antigos"}
          </button>

          <button
            onClick={handleSyncPrices}
            disabled={syncing || matching}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 1.5rem",
              borderRadius: "14px",
              background: "#ea580c",
              border: "none",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: syncing || matching ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.25)",
            }}
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando Preços..." : "Atualizar Preços via Shopee"}
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem 1.25rem",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.9rem",
            fontWeight: 600,
            backgroundColor:
              message.type === "success"
                ? "#dcfce7"
                : message.type === "error"
                ? "#fee2e2"
                : "#eff6ff",
            color:
              message.type === "success"
                ? "#166534"
                : message.type === "error"
                ? "#991b1b"
                : "#1e40af",
            border: `1px solid ${
              message.type === "success"
                ? "#86efac"
                : message.type === "error"
                ? "#fca5a5"
                : "#bfdbfe"
            }`,
          }}
        >
          {message.type === "success" && <CheckCircle2 size={18} />}
          {message.type === "error" && <AlertCircle size={18} />}
          {message.type === "info" && <Sparkles size={18} />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
