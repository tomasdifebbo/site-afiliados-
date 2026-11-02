import { prisma } from "@/lib/prisma";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import InfiniteProductGrid from "@/components/InfiniteProductGrid";
import { ShopeeHeroBanner, CategoryTopProduct } from "@/components/ShopeeHeroBanner";
import { ShopeeFlashDeals, FlashDealProduct } from "@/components/ShopeeFlashDeals";
import { ShopeeSearchBar } from "@/components/ShopeeSearchBar";

export const dynamic = "force-dynamic";

export default async function Home() {
  // 1. Buscar categorias com contagem de produtos
  const categories = await prisma.category.findMany({
    orderBy: { products: { _count: "desc" } },
    include: {
      _count: { select: { products: true } },
    },
  });

  // 2. Buscar o produto mais procurado/vendido de cada categoria principal para o Hero Banner
  const mainCategories = categories.filter((c) => c._count.products > 0).slice(0, 8);
  const bannerProductsPromises = mainCategories.map(async (cat) => {
    const topProd = await prisma.product.findFirst({
      where: { categoryId: cat.id, price: { gt: 0 } },
      orderBy: [{ sales: "desc" }, { ratingStar: "desc" }, { createdAt: "desc" }],
      select: {
        name: true,
        slug: true,
        price: true,
        imageUrl: true,
        sales: true,
        ratingStar: true,
        discountRate: true,
      },
    });

    if (!topProd || !topProd.price) return null;

    return {
      categoryName: cat.name,
      categorySlug: cat.slug,
      productName: topProd.name,
      productSlug: topProd.slug,
      price: topProd.price,
      imageUrl: topProd.imageUrl,
      sales: topProd.sales,
      ratingStar: topProd.ratingStar,
      discountRate: topProd.discountRate,
    } as CategoryTopProduct;
  });

  // 3. Buscar produtos para as Ofertas Relâmpago (produtos com maior desconto e vendas)
  const flashDealsPromise = prisma.product.findMany({
    where: {
      price: { gt: 0 },
      imageUrl: { not: "" },
    },
    orderBy: [
      { discountRate: "desc" },
      { sales: "desc" },
      { createdAt: "desc" },
    ],
    take: 48,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      imageUrl: true,
      videoUrl: true,
      discountRate: true,
      sales: true,
    },
  });

  // 4. Catálogo Geral Inicial (12 itens)
  const totalProductsPromise = prisma.product.count();
  const initialProductsPromise = prisma.product.findMany({
    take: 12,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      imageUrl: true,
      videoUrl: true,
      discountRate: true,
      sales: true,
      ratingStar: true,
      mlPrice: true,
      mlLink: true,
      category: {
        select: { name: true, slug: true },
      },
    },
  });

  const [bannerProductsRaw, flashDealsRaw, totalProducts, initialProducts] = await Promise.all([
    Promise.all(bannerProductsPromises),
    flashDealsPromise,
    totalProductsPromise,
    initialProductsPromise,
  ]);

  const topProductsByCategory: CategoryTopProduct[] = bannerProductsRaw.filter(
    (p): p is CategoryTopProduct => p !== null
  );

  const flashDealsProducts: FlashDealProduct[] = flashDealsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price ?? 0,
    imageUrl: p.imageUrl,
    discountRate: p.discountRate,
    sales: p.sales,
  }));

  return (
    <div style={{ backgroundColor: "#f5f5f5", minHeight: "100vh", paddingBottom: "4rem" }}>
      {/* Container Principal com Estilo Shopee */}
      <div className="container" style={{ paddingTop: "1.25rem" }}>
        {/* Barra de Busca Shopee em Destaque no Topo */}
        <div style={{ marginBottom: "1.25rem" }}>
          <ShopeeSearchBar />
        </div>

        {/* Banner Hero com Produtos Mais Procurados por Categoria (Largura Total) */}
        <ShopeeHeroBanner topProductsByCategory={topProductsByCategory} />

        {/* Seção Ofertas Relâmpago Clone Shopee com Timer Regressivo e Barra de Fogo */}
        <ShopeeFlashDeals products={flashDealsProducts} />

        {/* Barra de Categorias Rápidas */}
        <div
          style={{
            backgroundColor: "#fff",
            padding: "0.75rem 0.85rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            boxShadow: "0 1px 4px 0 rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#333", textTransform: "uppercase" }}>
              Navegar por Categorias
            </span>
            <a
              href="/categorias"
              style={{ fontSize: "0.82rem", color: "#ee4d2d", fontWeight: 700, textDecoration: "none" }}
            >
              Ver Todas ({categories.length})
            </a>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
              scrollbarWidth: "none",
            }}
          >
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/categoria/${cat.slug}`}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{cat.name}</span>
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>
                  ({cat._count.products})
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Vitrine Geral com Rolagem Infinita e Filtros Inteligentes */}
        <div className="vitrine-wrapper">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              borderBottom: "2px solid #ee4d2d",
              paddingBottom: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#ee4d2d", fontWeight: 900, fontSize: "1.15rem", textTransform: "uppercase" }}>
                DESCOBERTAS DO DIA
              </span>
              <span
                style={{
                  backgroundColor: "#ee4d2d",
                  color: "#fff",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                OFICIAL
              </span>
            </div>
            <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
              {totalProducts.toLocaleString("pt-BR")} achadinhos disponíveis
            </span>
          </div>

          <InfiniteProductGrid
            initialProducts={initialProducts}
            initialTotal={totalProducts}
            limit={12}
          />
        </div>
      </div>
    </div>
  );
}
