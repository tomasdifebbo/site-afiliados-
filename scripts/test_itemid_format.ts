import { shopeeGraphQL } from "../src/lib/shopee";

async function testItemIdQuery() {
  // Vamos buscar uma oferta qualquer para obter um itemId real
  const q1 = `query { productOfferV2(keyword: "relogio", limit: 1) { nodes { itemId shopId productName price } } }`;
  const r1 = await shopeeGraphQL<any>(q1, {});
  const sample = r1.productOfferV2.nodes[0];
  console.log("Amostra obtida:", sample);

  // Tentativa A: passando inline como literal Int64 no GraphQL
  console.log("\nTentativa A: inline itemId no GraphQL query...");
  try {
    const qA = `query { productOfferV2(itemId: ${sample.itemId}) { nodes { itemId productName price } } }`;
    const rA = await shopeeGraphQL<any>(qA, {});
    console.log("Resultado Tentativa A (inline number):", rA.productOfferV2.nodes.length);
  } catch (e: any) {
    console.error("Tentativa A falhou:", e.message);
  }

  // Tentativa B: passando inline como string no GraphQL
  console.log("\nTentativa B: inline string no GraphQL query...");
  try {
    const qB = `query { productOfferV2(itemId: "${sample.itemId}") { nodes { itemId productName price } } }`;
    const rB = await shopeeGraphQL<any>(qB, {});
    console.log("Resultado Tentativa B (inline string):", rB.productOfferV2.nodes.length);
  } catch (e: any) {
    console.error("Tentativa B falhou:", e.message);
  }

  // Tentativa C: variáveis com Int64 vs String vs Float
  console.log("\nTentativa C: variável $itemId: Int64 com número...");
  try {
    const qC = `query ($itemId: Int64) { productOfferV2(itemId: $itemId) { nodes { itemId productName price } } }`;
    const rC = await shopeeGraphQL<any>(qC, { itemId: Number(sample.itemId) });
    console.log("Resultado Tentativa C (variable number):", rC.productOfferV2.nodes.length);
  } catch (e: any) {
    console.error("Tentativa C falhou:", e.message);
  }

  // Tentativa D: variável $itemId: Int64 com string ou BigInt
  console.log("\nTentativa D: variável $itemId: Int64 com string...");
  try {
    const qD = `query ($itemId: Int64) { productOfferV2(itemId: $itemId) { nodes { itemId productName price } } }`;
    const rD = await shopeeGraphQL<any>(qD, { itemId: String(sample.itemId) });
    console.log("Resultado Tentativa D (variable string):", rD.productOfferV2.nodes.length);
  } catch (e: any) {
    console.error("Tentativa D falhou:", e.message);
  }
}

testItemIdQuery();
