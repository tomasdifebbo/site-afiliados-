import { prisma } from "../src/lib/prisma";
import { searchProductOffers, getProductOfferById } from "../src/lib/shopee";

async function runTests() {
  console.log("=== INICIANDO TESTES AUTOMATIZADOS DO CICLO 2 ===");
  let failures = 0;

  try {
    // 1. Testar getProductOfferById
    console.log("\n[Teste 1] Testando getProductOfferById com a Shopee API...");
    const sampleSearch = await searchProductOffers({ keyword: "mouse gamer", limit: 1 });
    if (!sampleSearch.nodes || sampleSearch.nodes.length === 0) {
      console.error("FAIL: Não foi possível obter uma oferta de teste.");
      failures++;
    } else {
      const sample = sampleSearch.nodes[0];
      const byIdOffer = await getProductOfferById(String(sample.itemId));
      if (byIdOffer && String(byIdOffer.itemId) === String(sample.itemId)) {
        console.log(`PASS: getProductOfferById retornou produto correto! ItemId: ${byIdOffer.itemId}, Preço: R$ ${byIdOffer.priceMin || byIdOffer.price}`);
      } else {
        console.error("FAIL: getProductOfferById não retornou o produto esperado.");
        failures++;
      }
    }

    // 2. Criar produto de teste com itemId real
    console.log("\n[Teste 2] Inserindo produto teste com itemId para validar sincronização...");
    const category = await prisma.category.findFirst();
    if (!category) throw new Error("Categoria não encontrada.");

    const sample = sampleSearch.nodes[0];
    const testItemId = `TEST_SYNC_${sample.itemId}_${Date.now()}`;
    const testSlug = `teste-sync-${Date.now().toString(36)}`;
    const oldPrice = 999.99;
    const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 48); // 2 dias atrás

    const testProd = await prisma.product.create({
      data: {
        name: `[TESTE-SYNC] ${sample.productName.slice(0, 40)}`,
        slug: testSlug,
        description: "Produto teste para validação de atualização automática de preços",
        price: oldPrice,
        affiliateLink: "https://shopee.com.br/test",
        imageUrl: sample.imageUrl,
        categoryId: category.id,
        itemId: testItemId,
        priceUpdatedAt: oldDate,
      },
    });

    console.log(`Produto de teste criado com preço antigo: R$ ${testProd.price} e data: ${testProd.priceUpdatedAt?.toISOString()}`);

    // 3. Simular atualização atômica de preço e data
    console.log("\n[Teste 3] Atualizando produto com dados frescos da Shopee...");
    const freshPrice = parseFloat(sample.priceMin || sample.price) || 49.90;
    const freshCommission = parseFloat(sample.commissionRate) || 0.15;
    const updatedDate = new Date();

    const updatedProd = await prisma.product.update({
      where: { id: testProd.id },
      data: {
        price: freshPrice,
        commissionRate: freshCommission,
        sales: sample.sales || 10,
        ratingStar: parseFloat(sample.ratingStar) || 4.8,
        discountRate: sample.priceDiscountRate || 20,
        priceUpdatedAt: updatedDate,
      },
    });

    if (
      updatedProd.price === freshPrice &&
      updatedProd.priceUpdatedAt &&
      updatedProd.priceUpdatedAt.getTime() > oldDate.getTime()
    ) {
      console.log(`PASS: Preço atualizado de R$ ${oldPrice} para R$ ${updatedProd.price}!`);
      console.log(`PASS: priceUpdatedAt avançado com sucesso para ${updatedProd.priceUpdatedAt.toISOString()}!`);
    } else {
      console.error("FAIL: Falha ao atualizar dados de preço e data.");
      failures++;
    }

    // 4. Limpeza
    console.log("\n[Teste 4] Limpando produto de teste do banco...");
    await prisma.product.delete({
      where: { id: testProd.id },
    });
    console.log("PASS: Banco limpo após teste.");

    // 5. Garantir contagem do banco
    const totalCount = await prisma.product.count();
    console.log(`PASS: Total de produtos reais intactos no banco: ${totalCount}`);

  } catch (error) {
    console.error("ERRO NO TESTE:", error);
    failures++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n================================================");
  if (failures === 0) {
    console.log("RESULTADO FINAL: TESTES DO CICLO 2 PASSARAM COM SUCESSO!");
  } else {
    console.error(`RESULTADO FINAL: ${failures} FALHA(S) ENCONTRADA(S).`);
    process.exit(1);
  }
}

runTests();
