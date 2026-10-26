import { prisma } from "../src/lib/prisma";

async function analyzeCategories() {
  console.log("=== ANÁLISE DE CATEGORIAS E PRODUTOS ATUAIS ===");

  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { name: "asc" }
  });

  console.log(`Total de categorias cadastradas: ${categories.length}`);
  categories.forEach(cat => {
    console.log(`- ${cat.name} (slug: ${cat.slug}): ${cat._count.products} produtos | affiliateLink: ${cat.affiliateLink || "nenhum"}`);
  });

  const totalProducts = await prisma.product.count();
  const withItemId = await prisma.product.count({ where: { itemId: { not: null } } });

  console.log(`\nTotal geral de produtos: ${totalProducts}`);
  console.log(`Produtos com itemId da Shopee API: ${withItemId}`);
  console.log(`Produtos antigos (sem itemId): ${totalProducts - withItemId}`);
}

analyzeCategories();
