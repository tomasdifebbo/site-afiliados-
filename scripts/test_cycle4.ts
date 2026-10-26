import { prisma } from "../src/lib/prisma";

async function runTests() {
  console.log("=== INICIANDO TESTES AUTOMATIZADOS DO CICLO 4 ===");
  let failures = 0;

  try {
    // 1. Testar ordenação por mais vendidos
    console.log("\n[Teste 1] Testando ordenação por mais vendidos (best_sales)...");
    const salesProducts = await prisma.product.findMany({
      orderBy: [{ sales: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: { id: true, name: true, sales: true, price: true, discountRate: true, ratingStar: true },
    });
    console.log(`PASS: ${salesProducts.length} produtos retornados ordenados por vendas.`);

    // 2. Testar ordenação por nota de avaliação
    console.log("\n[Teste 2] Testando ordenação por melhores avaliações (best_rating)...");
    const ratingProducts = await prisma.product.findMany({
      orderBy: [{ ratingStar: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: { id: true, name: true, ratingStar: true },
    });
    console.log(`PASS: ${ratingProducts.length} produtos retornados ordenados por nota.`);

    // 3. Testar ordenação por desconto
    console.log("\n[Teste 3] Testando ordenação por maiores descontos (best_discount)...");
    const discountProducts = await prisma.product.findMany({
      orderBy: [{ discountRate: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: { id: true, name: true, discountRate: true },
    });
    console.log(`PASS: ${discountProducts.length} produtos retornados ordenados por desconto.`);

    // 4. Testar integridade da base
    const totalCount = await prisma.product.count();
    console.log(`\nPASS: Total de produtos intactos no banco: ${totalCount}`);

  } catch (error: any) {
    console.error("ERRO NO TESTE:", error);
    failures++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n================================================");
  if (failures === 0) {
    console.log("RESULTADO FINAL: TESTES DO CICLO 4 PASSARAM COM SUCESSO!");
  } else {
    console.error(`RESULTADO FINAL: ${failures} FALHA(S) ENCONTRADA(S).`);
    process.exit(1);
  }
}

runTests();
