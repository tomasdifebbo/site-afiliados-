"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ShopeeSearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    router.push(`/busca?q=${encodeURIComponent(clean)}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      style={{
        position: "relative",
        maxWidth: "680px",
        width: "100%",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "4px 6px 4px 18px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          border: "2px solid #FF5722",
        }}
      >
        <Search size={20} color="#FF5722" style={{ marginRight: "10px", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="O que você está procurando na Shopee hoje? (Ex: fone sem fio, garrafa térmica...)"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "0.95rem",
            color: "#1e293b",
            background: "transparent",
            padding: "8px 0",
          }}
        />
        <button
          type="submit"
          style={{
            background: "linear-gradient(135deg, #FF5722 0%, #FF7A00 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "9px",
            padding: "10px 22px",
            fontSize: "0.92rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 2px 10px rgba(255, 87, 34, 0.3)",
          }}
        >
          Buscar na Shopee
        </button>
      </div>
    </form>
  );
}
