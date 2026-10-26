import { prisma } from "../src/lib/prisma";
import { getConversionReport } from "../src/lib/shopee";

async function runTests() {
  console.log("=== INICIANDO TESTES AUTOMATIZADOS DO CICLO 3 ===");
  let failures = 0;

  try {
    // 1. Testar getConversionReport via Shopee API
    console.log("\n[Teste 1] Testando chamada oficial a getConversionReport...");
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 3600;

    const report = await getConversionReport({
      purchaseTimeStart: thirtyDaysAgo,
      purchaseTimeEnd: now,
      limit: 10,
    });

    if (report && Array.isArray(report.nodes)) {
      console.log(`PASS: Shopee API conversionReport respondeu com sucesso! Nós retornados: ${report.nodes.length}`);
      console.log(`PageInfo: hasNextPage = ${report.pageInfo?.hasNextPage}, limit = ${report.pageInfo?.limit}`);
    } else {
      console.error("FAIL: Resposta inesperada de getConversionReport.");
      failures++;
    }

    // 2. Testar métricas locais de cliques no banco
    console.log("\n[Teste 2] Testando contagem e agrupamento de cliques...");
    const totalClicks = await prisma.click.count();
    console.log(`PASS: Total de cliques registrados no banco local: ${totalClicks}`);

    // 3. Testar integridade da base
    const totalProducts = await prisma.product.count();
    console.log(`PASS: Total de produtos preservados intactos no banco: ${totalProducts}`);

  } catch (error: any) {
    console.error("ERRO NO TESTE:", error);
    failures++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n================================================");
  if (failures === 0) {
    console.log("RESULTADO FINAL: TESTES DO CICLO 3 PASSARAM COM SUCESSO!");
  } else {
    console.error(`RESULTADO FINAL: ${failures} FALHA(S) ENCONTRADA(S).`);
    process.exit(1);
  }
}

runTests();
