import { searchProductOffers } from "../src/lib/shopee";

async function test() {
  console.log("Testing Shopee search for YouTube products...");
  const testItems = [
    "Amolador de Facas",
    "Seca Salada Centrifuga",
    "Seladora a Vacuo",
    "Garrafa Termica"
  ];
  for (const item of testItems) {
    try {
      const res = await searchProductOffers({ keyword: item, limit: 1 });
      if (res.nodes && res.nodes.length > 0) {
        const prod = res.nodes[0];
        console.log(`✓ Encontrado: "${item}" -> "${prod.productName.slice(0, 45)}..." | R$ ${prod.price} | Link: ${prod.offerLink.slice(0, 40)}...`);
      } else {
        console.log(`✗ Não encontrado na Shopee: "${item}"`);
      }
    } catch (e: any) {
      console.error(`Erro ao buscar "${item}":`, e.message);
    }
  }
}

test().catch(console.error);
