"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao sair:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        padding: "0.75rem 1rem",
        borderRadius: "12px",
        background: "transparent",
        border: "1px solid #fee2e2",
        color: "#dc2626",
        fontWeight: 700,
        fontSize: "0.85rem",
        cursor: loading ? "not-allowed" : "pointer",
        marginTop: "1rem",
        transition: "all 0.15s",
      }}
    >
      <LogOut size={16} />
      <span>{loading ? "Saindo..." : "Sair do Painel"}</span>
    </button>
  );
}
