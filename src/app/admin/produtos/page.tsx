import { prisma } from "@/lib/prisma";
import { Plus, Edit3, Trash2, ExternalLink, Zap, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { ShopeeSyncBar } from "./ShopeeSyncBar";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || "1", 10));
  const pageSize = 50;
  const skip = (page - 1) * pageSize;
  const search = resolvedParams?.q?.trim();

  const whereClause: any = search
    ? {
        OR: [
          { name: { contains: search } },
          { itemId: { contains: search } },
        ],
      }
    : {};

  const [totalProducts, products] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(totalProducts / pageSize);

  const formatDate = (date: Date | null) => {
    if (!date) return "Pendente";
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Hoje (recente)";
    if (diffHours < 24) return `Hoje (${diffHours}h atrás)`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  return (
    <div style={{ padding: "3rem", color: "#000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", fontWeight: 800 }}>Produtos</h1>
          <p style={{ color: "#555", fontWeight: 500 }}>
            {totalProducts.toLocaleString("pt-BR")} ofertas cadastradas no seu site.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link
            href="/admin/importar"
            className="btn btn-primary"
            style={{ gap: "8px", borderRadius: "16px", padding: "0.875rem 1.75rem", textDecoration: "none" }}
          >
            <Plus size={20} /> Importar Ofertas
          </Link>
        </div>
      </div>

      {/* Barra de Ações e Automação Shopee */}
      <ShopeeSyncBar />

      <div
        className="glass shadow-premium"
        style={{
          borderRadius: "28px",
          overflow: "hidden",
          backgroundColor: "#fff",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#fcfcfc", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: "1.25rem 1.5rem", fontWeight: 800 }}>Produto</th>
                <th style={{ padding: "1.25rem 1.5rem", fontWeight: 800 }}>Categoria</th>
                <th style={{ padding: "1.25rem 1.5rem", fontWeight: 800 }}>Preço & Desconto</th>
                <th style={{ padding: "1.25rem 1.5rem", fontWeight: 800 }}>Comissão & Vendas</th>
                <th style={{ padding: "1.25rem 1.5rem", fontWeight: 800 }}>Status API</th>
                <th style={{ padding: "1.25rem 1.5rem", fontWeight: 800, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const hasApi = Boolean(product.itemId);
                const commPercent = product.commissionRate ? (product.commissionRate * 100).toFixed(1) : null;

                return (
                  <tr key={product.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "1.25rem 1.5rem", maxWidth: "340px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          style={{ width: "50px", height: "50px", borderRadius: "12px", objectFit: "cover", flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.92rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={product.name}
                          >
                            {product.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600 }}>
                            {hasApi ? `Shopee ID: ${product.itemId}` : "Cadastrado manualmente"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <span
                        style={{
                          backgroundColor: "#f0f0f0",
                          color: "#333",
                          padding: "4px 10px",
                          borderRadius: "100px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                        }}
                      >
                        {product.category?.name || "Geral"}
                      </span>
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                        R$ {product.price ? product.price.toFixed(2) : "0.00"}
                      </div>
                      {product.discountRate ? (
                        <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 700 }}>
                          -{product.discountRate}% OFF
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      {commPercent ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "#ecfdf5",
                              color: "#059669",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              fontWeight: 800,
                              width: "fit-content",
                            }}
                          >
                            <Zap size={12} /> {commPercent}% comissão
                          </span>
                          {product.sales ? (
                            <span style={{ fontSize: "0.75rem", color: "#666", fontWeight: 600 }}>
                              {product.sales.toLocaleString("pt-BR")} vendidos
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "#999" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem" }}>
                      {hasApi ? (
                        <div>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "#0284c7",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={13} /> Sincronizável
                          </span>
                          <div style={{ fontSize: "0.72rem", color: "#888", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Clock size={11} /> {formatDate(product.priceUpdatedAt)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#a3a3a3", fontWeight: 600 }}>Sem ID da API</span>
                      )}
                    </td>
                    <td style={{ padding: "1.25rem 1.5rem", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <a
                          href={`/produto/${product.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Ver no site"
                          style={{
                            padding: "8px",
                            borderRadius: "10px",
                            background: "#eff6ff",
                            border: "none",
                            color: "#3b82f6",
                            display: "inline-flex",
                          }}
                        >
                          <ExternalLink size={18} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div
            style={{
              padding: "1.5rem 2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #f0f0f0",
              backgroundColor: "#fafafa",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: 600 }}>
              Página {page} de {totalPages} ({totalProducts.toLocaleString("pt-BR")} produtos)
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {page > 1 && (
                <Link
                  href={`/admin/produtos?page=${page - 1}`}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e5e5e5",
                    background: "#fff",
                    color: "#333",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                  }}
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/produtos?page=${page + 1}`}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e5e5e5",
                    background: "#fff",
                    color: "#333",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                  }}
                >
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
