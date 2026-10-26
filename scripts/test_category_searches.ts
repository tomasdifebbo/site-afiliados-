import { searchProductOffers } from "../src/lib/shopee";

async function testCategorySearches() {
  const categoriesToFill = [
    { name: "Games & Consoles", query: "videogame console controle gamer" },
    { name: "Beleza & Cuidados", query: "skincare maquiagem perfume cuidados" },
    { name: "Pets", query: "racao pet coleira arranhador cachorro gato" },
    { name: "Mamãe & Bebê", query: "fralda bebe carrinho brinquedo mordedor" },
    { name: "Casa & Eletro", query: "decoracao organizador cozinha luminaria" },
    { name: "Moda Infantil", query: "roupa infantil conjunto crianca calcado infantil" },
    { name: "Alimentos & Bebidas", query: "suplemento cafe chocolate petisco" },
  ];

  console.log("=== TESTANDO BUSCA DE PRODUTOS PARA CATEGORIAS VAZIAS ===");

  for (const cat of categoriesToFill) {
    const res = await searchProductOffers({
      keyword: cat.query,
      limit: 3,
      sortType: 2, // mais vendidos
    });

    console.log(`\nCategoria: ${cat.name} (${res.nodes.length} nós encontrados)`);
    if (res.nodes.length > 0) {
      const p = res.nodes[0];
      console.log(`  Top produto: "${p.productName.slice(0, 45)}..."`);
      console.log(`  Preço: R$ ${p.priceMin || p.price} | Comissão: ${(parseFloat(p.commissionRate)*100).toFixed(1)}% | Vendas: ${p.sales}`);
    }
  }
}

testCategorySearches();
