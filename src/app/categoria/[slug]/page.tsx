import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import InfiniteProductGrid from "@/components/InfiniteProductGrid";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) notFound();

  const [totalProducts, initialProducts] = await Promise.all([
    prisma.product.count({
      where: { categoryId: category.id },
    }),
    prisma.product.findMany({
      where: { categoryId: category.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        imageUrl: true,
        category: {
          select: { name: true, slug: true },
        },
      },
    }),
  ]);

  return (
    <div className="container" style={{ padding: "3rem 1.5rem 6rem" }}>
      {/* Breadcrumbs */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.85rem",
          color: "hsl(var(--muted-foreground))",
          marginBottom: "2rem",
        }}
      >
        <a href="/">Home</a>
        <ChevronRight size={14} />
        <a href="/categorias">Categorias</a>
        <ChevronRight size={14} />
        <span style={{ color: "hsl(var(--foreground))", fontWeight: 700 }}>{category.name}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: "3rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(255, 102, 0, 0.1)",
            padding: "6px 14px",
            borderRadius: "100px",
            color: "hsl(var(--primary))",
            fontWeight: 800,
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          <Sparkles size={16} /> {totalProducts} produtos encontrados
        </div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "clamp(1.8rem, 5vw, 3rem)", fontWeight: 900, marginBottom: "0.8rem", lineHeight: 1.15 }}>
          {category.name}
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "1.1rem", maxWidth: "700px", lineHeight: 1.6 }}>
          Confira nossa seleção exclusiva de achadinhos em {category.name}. Role para baixo para explorar todas as ofertas com links diretos oficiais da Shopee.
        </p>
      </div>

      {/* Infinite Scrolling Grid */}
      <InfiniteProductGrid
        initialProducts={initialProducts}
        initialTotal={totalProducts}
        categorySlug={category.slug}
        limit={12}
      />
    </div>
  );
}
