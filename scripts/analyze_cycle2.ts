import { prisma } from "../src/lib/prisma";
import { searchProductOffers } from "../src/lib/shopee";

async function analyzeState() {
  console.log("=== ANÁLISE INICIAL DO CICLO 2 ===");
  
  const totalProducts = await prisma.product.count();
  const withItemId = await prisma.product.count({
    where: { itemId: { not: null } }
  });
  const withPriceUpdatedAt = await prisma.product.count({
    where: { priceUpdatedAt: { not: null } }
  });

  console.log(`Total de produtos no banco: ${totalProducts}`);
  console.log(`Produtos com itemId preenchido: ${withItemId}`);
  console.log(`Produtos com priceUpdatedAt: ${withPriceUpdatedAt}`);

  // Verificar amostra de affiliateLinks antigos
  const sampleOld = await prisma.product.findMany({
    take: 5,
    select: { id: true, name: true, affiliateLink: true, itemId: true }
  });
  console.log("Amostra de produtos existentes:", sampleOld);

  // Testar busca por itemId específico na Shopee API
  console.log("\nTestando busca por itemId na Shopee API...");
  // Vamos buscar uma oferta qualquer primeiro para obter um itemId real válido
  const sampleSearch = await searchProductOffers({ keyword: "relogio smartwatch", limit: 1 });
  if (sampleSearch.nodes.length > 0) {
    const validOffer = sampleSearch.nodes[0];
    console.log(`Testando consulta direta de itemId: ${validOffer.itemId}`);
    
    const byIdRes = await searchProductOffers({
      itemId: Number(validOffer.itemId)
    });
    console.log(`Resultado da busca por itemId direto: ${byIdRes.nodes.length} nós retornados.`);
    if (byIdRes.nodes.length > 0) {
      console.log(`Oferta obtida: Preço: R$ ${byIdRes.nodes[0].priceMin || byIdRes.nodes[0].price}, Comissão: ${(parseFloat(byIdRes.nodes[0].commissionRate)*100).toFixed(1)}%`);
    }
  }

  await prisma.$disconnect();
}

analyzeState();
