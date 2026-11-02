"use client";

import { useEffect, useRef, useState } from "react";

interface Status {
  configured: boolean;
  affiliateTag: boolean;
  total: number;
  checked: number;
  matched: number;
  mlCheaper: number;
}

/** Roda a comparação Shopee x Mercado Livre em lotes de 20 até atingir a meta. */
export function MercadoLivreCompareBar() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState(500);
  const [log, setLog] = useState<string[]>([]);
  const stopRef = useRef(false);

  const loadStatus = async () => {
    const res = await fetch("/api/admin/mercadolivre/compare");
    if (res.ok) setStatus(await res.json());
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const addLog = (msg: string) => setLog((l) => [msg, ...l].slice(0, 12));

  const run = async () => {
    setRunning(true);
    stopRef.current = false;
    let done = 0;
    while (!stopRef.current && done < target) {
      const res = await fetch("/api/admin/mercadolivre/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: Math.min(20, target - done) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        addLog(`❌ ${data.error || `Erro ${res.status}`}`);
        break;
      }
      done += data.processed;
      addLog(`✅ Lote: ${data.processed} verificados, ${data.matched} encontrados no ML (faltam ${data.remaining})`);
      await loadStatus();
      if (data.processed === 0 || data.remaining === 0) break;
    }
    setRunning(false);
  };

  const box: React.CSSProperties = {
    padding: "1.25rem 1.5rem",
    borderRadius: "20px",
    background: "#fffbe0",
    border: "2px solid #f5c800",
    marginBottom: "2rem",
    color: "#111",
  };

  if (status && !status.configured) {
    return (
      <div style={box}>
        <strong>Comparação Mercado Livre:</strong> defina <code>ML_CLIENT_ID</code> e <code>ML_CLIENT_SECRET</code> no
        <code> .env</code> e reinicie o servidor.
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>🛒 Comparação Shopee x Mercado Livre</div>
          {status && (
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#444" }}>
              {status.checked.toLocaleString("pt-BR")} de {status.total.toLocaleString("pt-BR")} verificados ·{" "}
              {status.matched} com produto igual no ML · {status.mlCheaper} mais baratos no ML
              {!status.affiliateTag && (
                <span style={{ color: "#b45309" }}> · ⚠ ML_AFFILIATE_TAG não definido (links sem comissão)</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 700 }}>
            Meta:{" "}
            <input
              type="number"
              min={20}
              step={20}
              value={target}
              onChange={(e) => setTarget(Math.max(1, Number(e.target.value)))}
              disabled={running}
              style={{ width: "80px", padding: "6px", borderRadius: "8px", border: "1px solid #ccc" }}
            />
          </label>
          {running ? (
            <button className="btn" onClick={() => (stopRef.current = true)} style={{ background: "#111", color: "#fff", borderRadius: "12px" }}>
              Parar
            </button>
          ) : (
            <button className="btn" onClick={run} style={{ background: "#2d3277", color: "#fff", borderRadius: "12px" }}>
              Comparar preços
            </button>
          )}
        </div>
      </div>
      {log.length > 0 && (
        <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", fontFamily: "monospace", maxHeight: "140px", overflowY: "auto" }}>
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
