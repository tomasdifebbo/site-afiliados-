import { prisma } from "../src/lib/prisma";
import { searchProductOffers, offerToProductData, ShopeeProductOffer } from "../src/lib/shopee";

// Mapeamento de termos de busca por categoria
const CATEGORY_SEARCH_MAP: Record<string, string[]> = {
  "Alimentos & Bebidas": ["cafe gourmet", "chocolate importado", "suplemento creatina"],
  "Beleza & Cuidados": ["skincare facial", "perfume feminino", "kit maquiagem"],
  "Casa & Eletro": ["luminaria led", "organizador cozinha", "decoracao quarto"],
  "Delivery": ["copo termico", "marmita termica", "garrafa termica"],
  "Games & Consoles": ["controle videogame", "headset gamer", "mouse gamer rgb"],
  "Mamãe & Bebê": ["mordedor bebe", "brinquedo educativo bebe", "chupeta"],
  "Moda & Acessórios": ["oculos de sol", "carteira masculina couro", "relogio feminino"],
  "Moda Infantil": ["conjunto infantil menina", "conjunto infantil menino", "vestido infantil"],
  "Pets": ["coleira cachorro", "brinquedo pet", "arranhador gato"],
  "Relógios": ["relogio masculino esportivo", "smartwatch", "relogio digital"],
  "Áudio": ["fone bluetooth sem fio", "caixa de som bluetooth", "microfone lapela"],
  "Celulares & Gadgets": ["suporte celular", "carregador rapido celular", "fone de ouvido tws"],
  "Eletrodomésticos": ["air fryer acessorios", "mini liquidificador", "aspirador portatil"],
  "Saúde": ["termometro digital", "massageador eletrico", "oximetro pulso"],
  "Viagem & Malas": ["organizador de mala", "mochila impermeavel", "almofada pescoco viagem"],
  "Bolsas Femininas": ["bolsa transversal feminina", "bolsa feminina ombro", "mochila feminina"],
  "Bolsas Masculinas": ["mochila antifurto masculina", "bolsa transversal masculina", "pasta executiva"],
  "Calçados Femininos": ["tenis feminino casual", "sandalia feminina salto", "chinelo nuvem"],
  "Calçados Masculinos": ["tenis masculino esportivo", "sapatenis masculino", "bota masculina couro"],
  "Moda Feminina": ["vestido feminino verao", "blusa feminina casual", "calca feminina alfaiataria"],
  "Moda Masculina": ["camiseta masculina algodao", "bermuda masculina sarja", "camisa polo masculina"],
};

async function syncAllCategories() {
  console.log("=== INICIANDO IMPORTAÇÃO E ATUALIZAÇÃO DE CATEGORIAS VIA SHOPEE API ===\n");

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  let totalImported = 0;
  let totalSkipped = 0;

  for (const cat of categories) {
    const searchTerms = CATEGORY_SEARCH_MAP[cat.name] || [cat.name.toLowerCase()];
    const isCurrentlyEmpty = cat._count.products === 0;
    const targetPerCategory = isCurrentlyEmpty ? 25 : 10; // Prioriza preencher as vazias

    console.log(`\n--------------------------------------------------`);
    console.log(`Processando Categoria: "${cat.name}" (Atual: ${cat._count.products} produtos)`);
    console.log(`Buscando até ~${targetPerCategory} produtos na Shopee API...`);

    let catImported = 0;

    for (const term of searchTerms) {
      if (catImported >= targetPerCategory) break;

      try {
        // Busca os mais vendidos com o termo
        const result = await searchProductOffers({
          keyword: term,
          limit: 15,
          sortType: 2, // Mais vendidos
        });

        const offers: ShopeeProductOffer[] = result.nodes || [];

        for (const offer of offers) {
          if (catImported >= targetPerCategory) break;

          const itemIdStr = String(offer.itemId);

          // Checar se já existe pelo itemId
          const existsByItemId = await prisma.product.findUnique({
            where: { itemId: itemIdStr },
          });

          if (existsByItemId) {
            totalSkipped++;
            continue;
          }

          // Checar se já existe pelo nome idêntico
          const existsByName = await prisma.product.findFirst({
            where: { name: offer.productName.trim() },
          });

          if (existsByName) {
            // Se já existia antes sem itemId, vinculamos o itemId oficial a ele!
            if (!existsByName.itemId) {
              await prisma.product.update({
                where: { id: existsByName.id },
                data: {
                  itemId: itemIdStr,
                  shopId: String(offer.shopId),
                  commissionRate: parseFloat(offer.commissionRate) || existsByName.commissionRate,
                  sales: typeof offer.sales === "number" ? offer.sales : existsByName.sales,
                  ratingStar: parseFloat(offer.ratingStar) || existsByName.ratingStar,
                  discountRate: typeof offer.priceDiscountRate === "number" ? offer.priceDiscountRate : existsByName.discountRate,
                  priceUpdatedAt: new Date(),
                },
              });
            }
            totalSkipped++;
            continue;
          }

          // Inserir novo produto oficial
          const baseData = offerToProductData(offer);
          await prisma.product.create({
            data: {
              ...baseData,
              categoryId: cat.id,
            },
          });

          catImported++;
          totalImported++;
        }
      } catch (err: any) {
        console.warn(`Aviso na busca por "${term}" para ${cat.name}:`, err.message);
      }
    }

    console.log(`Resultado para "${cat.name}": +${catImported} novos produtos cadastrados com sucesso!`);
  }

  console.log("\n==================================================");
  console.log(`TOTAL IMPORTADO: ${totalImported} novos produtos cadastrados`);
  console.log(`TOTAL PULADO / VINCULADO: ${totalSkipped} produtos`);

  const finalTotal = await prisma.product.count();
  const finalWithApi = await prisma.product.count({ where: { itemId: { not: null } } });

  console.log(`Total geral de produtos no site agora: ${finalTotal}`);
  console.log(`Produtos com Shopee Open API ativa: ${finalWithApi}`);

  await prisma.$disconnect();
}

syncAllCategories();
