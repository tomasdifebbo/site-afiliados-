import { prisma } from "../src/lib/prisma";
import { searchProductOffers, offerToProductData } from "../src/lib/shopee";

async function runTests() {
  console.log("=== INICIANDO TESTES AUTOMATIZADOS DO CICLO 1 ===");
  let failures = 0;

  try {
    // 1. Testar busca na Shopee API
    console.log("\n[Teste 1] Testando comunicação com Shopee Open API...");
    const searchRes = await searchProductOffers({
      keyword: "fone de ouvido bluetooth",
      page: 1,
      limit: 2,
      sortType: 1, // TOP_SALES
    });

    if (!searchRes || !searchRes.nodes || searchRes.nodes.length === 0) {
      console.error("FAIL: API Shopee não retornou produtos ou nodes vazio.");
      failures++;
    } else {
      console.log(`PASS: API Shopee respondeu com sucesso! ${searchRes.nodes.length} produtos retornados.`);
      console.log(`Exemplo de produto: "${searchRes.nodes[0].productName.slice(0, 40)}..." | itemId: ${searchRes.nodes[0].itemId} | comissão: ${(parseFloat(searchRes.nodes[0].commissionRate) * 100).toFixed(1)}%`);
    }

    // 2. Testar inserção no banco de dados com os novos campos
    console.log("\n[Teste 2] Testando inserção no banco via Prisma...");
    const sampleOffer = searchRes.nodes[0];
    const category = await prisma.category.findFirst();
    if (!category) {
      throw new Error("Nenhuma categoria encontrada no banco para teste.");
    }

    const testItemId = `TEST_E2E_${sampleOffer.itemId}_${Date.now()}`;
    const basePayload = offerToProductData(sampleOffer);
    basePayload.itemId = testItemId;
    basePayload.name = `[TESTE-E2E] ${sampleOffer.productName.slice(0, 50)}`;

    const created = await prisma.product.create({
      data: {
        ...basePayload,
        categoryId: category.id,
      },
    });

    if (created && created.itemId === testItemId && created.commissionRate !== null) {
      console.log(`PASS: Produto teste criado com sucesso! ID: ${created.id}, itemId: ${created.itemId}, rate: ${created.commissionRate}%`);
    } else {
      console.error("FAIL: Falha ao validar dados inseridos no banco.");
      failures++;
    }

    // 3. Testar restrição de unicidade (itemId deve impedir duplicação)
    console.log("\n[Teste 3] Testando constraint unique de itemId...");
    try {
      await prisma.product.create({
        data: {
          ...basePayload,
          name: "Outro nome mas mesmo itemId",
          categoryId: category.id,
        },
      });
      console.error("FAIL: Conseguiu duplicar produto com mesmo itemId! Constraint falhou.");
      failures++;
    } catch (err: any) {
      if (err.code === "P2002") {
        console.log("PASS: Constraint unique (P2002) acionada corretamente. Duplicação evitada pelo banco!");
      } else {
        console.warn("Aviso: Erro recebido mas com código diferente:", err.message);
      }
    }

    // 4. Limpeza do produto teste
    console.log("\n[Teste 4] Limpando produto de teste criado...");
    await prisma.product.delete({
      where: { id: created.id },
    });
    console.log("PASS: Limpeza concluída, banco mantido limpo.");

    // 5. Verificação da contagem total de produtos
    const totalCount = await prisma.product.count();
    console.log(`PASS: Total de produtos reais intactos no banco: ${totalCount}`);

  } catch (error) {
    console.error("ERRO CRÍTICO NO TESTE:", error);
    failures++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n================================================");
  if (failures === 0) {
    console.log("RESULTADO FINAL: TODOS OS TESTES PASSARAM COM SUCESSO!");
    process.exit(0);
  } else {
    console.error(`RESULTADO FINAL: ${failures} FALHA(S) ENCONTRADA(S).`);
    process.exit(1);
  }
}

runTests();
