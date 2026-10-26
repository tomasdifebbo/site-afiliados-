import { searchProductOffers } from "../src/lib/shopee";

async function testSingleKeywords() {
  const tests = [
    { cat: "Pets", kw: "coleira pet" },
    { cat: "Pets", kw: "brinquedo cachorro" },
    { cat: "Alimentos", kw: "cafe gourmet" },
    { cat: "Alimentos", kw: "chocolate importado" },
    { cat: "Beleza", kw: "perfume feminino" },
    { cat: "Games", kw: "controle ps4" },
    { cat: "Mamãe & Bebê", kw: "mordedor bebe" },
    { cat: "Casa & Eletro", kw: "luminaria led" },
  ];

  for (const t of tests) {
    const res = await searchProductOffers({ keyword: t.kw, limit: 1, sortType: 2 });
    if (res.nodes.length > 0) {
      const p = res.nodes[0];
      console.log(`[${t.cat}] "${t.kw}" -> "${p.productName.slice(0, 40)}" | R$ ${p.priceMin || p.price} | Vendas: ${p.sales} | Comissao: ${(parseFloat(p.commissionRate)*100).toFixed(1)}%`);
    } else {
      console.log(`[${t.cat}] "${t.kw}" -> nenhum`);
    }
  }
}

testSingleKeywords();
