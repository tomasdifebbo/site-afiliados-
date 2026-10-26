"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Senha incorreta.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Falha na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        backgroundColor: "#f8fafc",
        backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div
        className="glass shadow-premium"
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#fff",
          borderRadius: "28px",
          padding: "2.5rem",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              backgroundColor: "#fff7ed",
              color: "#ea580c",
              border: "1px solid #fed7aa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "0 8px 20px rgba(234, 88, 12, 0.15)",
            }}
          >
            <Lock size={26} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-outfit)",
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
            }}
          >
            Acesso Restrito
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "6px" }}>
            Digite a senha de administrador para acessar o centro de comando.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "12px",
              backgroundColor: "#fee2e2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label
              htmlFor="admin-password"
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "0.5rem",
              }}
            >
              Senha Administrativa
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha..."
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.875rem 2.75rem 0.875rem 1rem",
                  borderRadius: "14px",
                  border: "1px solid #cbd5e1",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border 0.2s",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "1rem",
              borderRadius: "14px",
              backgroundColor: "#ea580c",
              color: "#fff",
              border: "none",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.3)",
              transition: "transform 0.15s, background-color 0.15s",
            }}
          >
            {loading ? "Verificando..." : "Entrar no Painel"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #f1f5f9",
            textAlign: "center",
            fontSize: "0.78rem",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <ShieldCheck size={14} color="#16a34a" />
          <span>Sessão protegida com cookie seguro HttpOnly</span>
        </div>
      </div>
    </div>
  );
}
