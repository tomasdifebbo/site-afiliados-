"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw, Settings, ShieldAlert, Sparkles } from "lucide-react";

interface Status {
  configured: boolean;
  hasRefreshToken?: boolean;
  affiliateTag: boolean;
  tag?: string;
  tool?: string;
  clientId?: string;
  total: number;
  checked: number;
  matched: number;
  mlCheaper: number;
}

export function MercadoLivreCompareBar() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState(500);
  const [log, setLog] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [urlMessage, setUrlMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  const stopRef = useRef(false);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/admin/mercadolivre/compare");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.tag) setTagInput(data.tag);
        if (data.tool) setToolInput(data.tool);
      }
    } catch {}
  };

  useEffect(() => {
    loadStatus();

    // Lê parâmetros da URL caso venha do retorno de autorização OAuth
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ml_status") === "connected") {
        setUrlMessage({
          type: "success",
          text: "🎉 Conta do Mercado Livre conectada e autorizada com sucesso! A busca e comparação de preços estão 100% ativas.",
        });
      } else if (params.get("ml_error")) {
        setUrlMessage({
          type: "error",
          text: `⚠️ Erro na autorização do Mercado Livre: ${params.get("ml_error")}`,
        });
      }
    }
  }, []);

  const addLog = (msg: string) => setLog((l) => [msg, ...l].slice(0, 15));

  const run = async () => {
    setRunning(true);
    stopRef.current = false;
    let done = 0;
    while (!stopRef.current && done < target) {
      try {
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
        addLog(`✅ Lote: ${data.processed} verificados, ${data.matched} encontrados no ML (restam ${data.remaining})`);
        await loadStatus();
        if (data.processed === 0 || data.remaining === 0) break;
      } catch (err: any) {
        addLog(`❌ Falha na requisição: ${err.message}`);
        break;
      }
    }
    setRunning(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/mercadolivre/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateTag: tagInput.trim(),
          affiliateTool: toolInput.trim(),
          refreshToken: manualTokenInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
        await loadStatus();
        setManualTokenInput("");
      } else {
        alert(data.error || "Erro ao salvar");
      }
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/admin/mercadolivre/callback`
    : "http://localhost:3000/api/admin/mercadolivre/callback";

  const boxStyle: React.CSSProperties = {
    padding: "1.5rem",
    borderRadius: "20px",
    background: "#fffde6",
    border: "2px solid #facc15",
    marginBottom: "2rem",
    color: "#0f172a",
    boxShadow: "0 4px 20px rgba(250,204,21,0.15)",
  };

  return (
    <div style={boxStyle}>
      {/* Mensagem de Feedback de Retorno OAuth */}
      {urlMessage && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "10px 16px",
            borderRadius: "12px",
            background: urlMessage.type === "success" ? "#dcfce7" : "#fee2e2",
            color: urlMessage.type === "success" ? "#15803d" : "#b91c1c",
            border: `1px solid ${urlMessage.type === "success" ? "#86efac" : "#fca5a5"}`,
            fontSize: "0.88rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{urlMessage.text}</span>
          <button
            onClick={() => setUrlMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cabeçalho da Barra */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.25rem" }}>🛒</span>
            <span style={{ fontWeight: 900, fontSize: "1.15rem", color: "#1e293b" }}>
              Comparação Shopee x Mercado Livre
            </span>
            {status?.configured && (
              <span style={{ fontSize: "0.72rem", background: "#fef08a", color: "#854d0e", padding: "2px 8px", borderRadius: "999px", fontWeight: 800 }}>
                App: 8897101149016100
              </span>
            )}
            {status?.hasRefreshToken ? (
              <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "999px", fontWeight: 800 }}>
                ✅ OAuth Ativo
              </span>
            ) : (
              <span style={{ fontSize: "0.72rem", background: "#fed7aa", color: "#c2410c", padding: "2px 8px", borderRadius: "999px", fontWeight: 800 }}>
                ⚠️ Autorização Necessária
              </span>
            )}
          </div>

          {status && (
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginTop: "4px" }}>
              <strong>{status.checked.toLocaleString("pt-BR")}</strong> de {status.total.toLocaleString("pt-BR")} produtos verificados ·{" "}
              <strong>{status.matched}</strong> com equivalente no ML ·{" "}
              <strong>{status.mlCheaper}</strong> mais baratos no ML
              {!status.affiliateTag && (
                <span style={{ color: "#b45309" }}> · ⚠ Sem tag de comissão</span>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {!status?.hasRefreshToken && (
            <a
              href="/api/admin/mercadolivre/auth"
              className="btn"
              style={{
                background: "linear-gradient(135deg, #FFE600 0%, #F5C800 100%)",
                color: "#2D3277",
                border: "1px solid #eab308",
                borderRadius: "12px",
                padding: "8px 14px",
                fontWeight: 800,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(245,200,0,0.4)",
              }}
            >
              <ExternalLink size={14} /> Conectar Conta Mercado Livre
            </a>
          )}

          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              background: "#fff",
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "8px 12px",
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Settings size={14} /> {showConfig ? "Ocultar Ajustes" : "Configurar Afiliado / Token"}
          </button>

          <label style={{ fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
            Meta:
            <input
              type="number"
              min={20}
              step={20}
              value={target}
              onChange={(e) => setTarget(Math.max(1, Number(e.target.value)))}
              disabled={running}
              style={{ width: "70px", padding: "6px 8px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700 }}
            />
          </label>

          {running ? (
            <button
              onClick={() => (stopRef.current = true)}
              style={{ background: "#0f172a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "12px", fontWeight: 800, cursor: "pointer" }}
            >
              Parar
            </button>
          ) : (
            <button
              onClick={run}
              style={{
                background: "#2D3277",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "12px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(45,50,119,0.3)",
              }}
            >
              Comparar Preços
            </button>
          )}
        </div>
      </div>

      {/* Dica da URL de Redirecionamento caso precise autorizar */}
      {!status?.hasRefreshToken && (
        <div style={{ marginTop: "1rem", background: "#ffffff", borderRadius: "12px", padding: "12px 16px", border: "1px solid #fde047", fontSize: "0.82rem", color: "#475569" }}>
          <div style={{ fontWeight: 800, color: "#854d0e", marginBottom: "4px" }}>
            💡 Dica para Autorização no Mercado Livre DevCenter:
          </div>
          <div>
            Na tela do seu aplicativo no <strong>Mercado Livre DevCenter</strong>, certifique-se de preencher o campo <strong>URL de Redirecionamento (Redirect URI)</strong> com o link abaixo:
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
            <code style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", color: "#0f172a", fontWeight: 700, fontSize: "0.78rem" }}>
              {redirectUri}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(redirectUri);
                setCopiedUri(true);
                setTimeout(() => setCopiedUri(false), 2000);
              }}
              style={{ background: "#e2e8f0", border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
            >
              {copiedUri ? "✅ Copiado!" : "Copiar URI"}
            </button>
          </div>
        </div>
      )}

      {/* Painel Expansível de Configuração (Afiliados / Token Manual) */}
      {showConfig && (
        <form onSubmit={handleSaveConfig} style={{ marginTop: "1rem", background: "#fff", padding: "1rem 1.25rem", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: "8px", color: "#1e293b" }}>
            ⚙️ Configurações de Afiliado e Credenciais do Mercado Livre
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", display: "block", marginBottom: "4px" }}>
                Tag de Afiliado (matt_word):
              </label>
              <input
                type="text"
                placeholder="Ex: achadinhosdodia"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", display: "block", marginBottom: "4px" }}>
                ID da Ferramenta (matt_tool):
              </label>
              <input
                type="text"
                placeholder="Ex: 12345678"
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", display: "block", marginBottom: "4px" }}>
                Refresh Token Manual (Opcional):
              </label>
              <input
                type="text"
                placeholder="Cole o TG-XXXX se já tiver gerado"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            {configSuccess && (
              <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 800, alignSelf: "center" }}>
                ✅ Configurações salvas com sucesso!
              </span>
            )}
            <button
              type="submit"
              disabled={savingConfig}
              style={{
                background: "#0f172a",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: 800,
                fontSize: "0.85rem",
                cursor: savingConfig ? "not-allowed" : "pointer",
              }}
            >
              {savingConfig ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>
      )}

      {/* Log de Execução da Comparação */}
      {log.length > 0 && (
        <div style={{ marginTop: "1rem", background: "#0f172a", color: "#f8fafc", padding: "10px 14px", borderRadius: "10px", fontSize: "0.78rem", fontFamily: "monospace", maxHeight: "140px", overflowY: "auto" }}>
          {log.map((l, i) => (
            <div key={i} style={{ padding: "2px 0" }}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
