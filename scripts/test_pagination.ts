import { searchProductOffers } from "../src/lib/shopee";

async function testPagination() {
  console.log("=== TESTANDO PAGINAÇÃO NA SHOPEE OPEN API ===");
  
  for (let p = 1; p <= 3; p++) {
    const res = await searchProductOffers({
      keyword: "smartphone",
      page: p,
      limit: 50,
      sortType: 2, // mais vendidos
    });
    console.log(`Página ${p}: ${res.nodes.length} nós retornados | hasNextPage: ${res.pageInfo.hasNextPage}`);
    if (res.nodes.length > 0) {
      console.log(`  Primeiro item pág ${p}: [${res.nodes[0].itemId}] ${res.nodes[0].productName.slice(0, 35)}... | R$ ${res.nodes[0].priceMin || res.nodes[0].price}`);
    }
  }
}

testPagination();
