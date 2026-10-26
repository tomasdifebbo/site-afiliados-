import { prisma } from "../src/lib/prisma";
import { searchProductOffers, offerToProductData, ShopeeProductOffer } from "../src/lib/shopee";

// Mapeamento enriquecido de termos de busca para cada categoria
const CATEGORY_SEARCH_MAP: Record<string, string[]> = {
  "Games & Consoles": ["videogame", "controle gamer", "headset gamer", "teclado gamer"],
  "Pets": ["racao cachorro", "brinquedo gato", "coleira peitoral", "cama pet"],
  "Beleza & Cuidados": ["perfume", "skincare", "maquiagem", "secador cabelo"],
  "Mamãe & Bebê": ["brinquedo bebe", "mordedor bebe", "carrinho bebe", "mamadeira"],
  "Casa & Eletro": ["luminaria led", "decoracao casa", "organizador cozinha", "tapete sala"],
  "Alimentos & Bebidas": ["cafe gourmet", "chocolate importado", "suplemento whey", "creatina"],
  "Delivery": ["copo termico", "garrafa termica", "marmita termica", "lancheira"],
  "Moda Infantil": ["roupa infantil", "vestido infantil", "conjunto infantil", "tenis infantil"],
  "Moda & Acessórios": ["oculos de sol", "carteira couro", "cinto couro", "bone"],
  "Relógios": ["smartwatch", "relogio masculino esportivo", "relogio digital", "relogio feminino"],
  "Áudio": ["fone bluetooth sem fio", "caixa de som bluetooth", "headphone sem fio", "fone tws"],
  "Celulares & Gadgets": ["suporte celular", "carregador rapido", "capinha celular", "cabo tipo c"],
  "Eletrodomésticos": ["air fryer", "mini liquidificador", "aspirador portatil", "ventilador"],
  "Saúde": ["termometro digital", "massageador eletrico", "oximetro", "balanca digital"],
  "Viagem & Malas": ["mochila viagem", "organizador de mala", "mala de bordo", "almofada pescoco"],
  "Bolsas Femininas": ["bolsa transversal feminina", "bolsa feminina ombro", "mochila feminina", "bolsa tote"],
  "Bolsas Masculinas": ["mochila masculina", "bolsa transversal masculina", "pasta notebook"],
  "Calçados Femininos": ["tenis feminino casual", "sandalia feminina", "chinelo nuvem", "bota feminina"],
  "Calçados Masculinos": ["tenis masculino esportivo", "sapatenis masculino", "chinelo masculino", "bota masculina"],
  "Moda Feminina": ["vestido feminino", "blusa feminina casual", "calca feminina", "conjunto feminino"],
  "Moda Masculina": ["camiseta masculina algodao", "bermuda masculina", "camisa polo", "calca jeans masculina"],
};

async function importMassiveCatalog() {
  console.log("=== INICIANDO CARGA MASSIVA DE PRODUTOS SHOPEE POR CATEGORIA ===\n");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  let grandTotalImported = 0;
  let grandTotalSkipped = 0;

  for (const cat of categories) {
    const terms = CATEGORY_SEARCH_MAP[cat.name] || [cat.name.toLowerCase()];
    console.log(`\n======================================================`);
    console.log(`[CATEGORIA: ${cat.name}]`);
    console.log(`Termos planejados: ${terms.join(", ")}`);

    let categoryNewCount = 0;

    for (const term of terms) {
      // Buscar página 1 e página 2 (50 itens por página = até 100 itens por termo)
      for (let p = 1; p <= 2; p++) {
        try {
          const res = await searchProductOffers({
            keyword: term,
            page: p,
            limit: 50,
            sortType: 2, // Mais vendidos
          });

          const offers = res.nodes || [];
          if (offers.length === 0) break;

          for (const offer of offers) {
            const itemIdStr = String(offer.itemId);

            // Verificar se já existe no banco por itemId
            const exists = await prisma.product.findUnique({
              where: { itemId: itemIdStr },
              select: { id: true },
            });

            if (exists) {
              grandTotalSkipped++;
              continue;
            }

            // Verificar se já existe pelo nome exato
            const existsName = await prisma.product.findFirst({
              where: { name: offer.productName.trim() },
              select: { id: true, itemId: true },
            });

            if (existsName) {
              if (!existsName.itemId) {
                await prisma.product.update({
                  where: { id: existsName.id },
                  data: {
                    itemId: itemIdStr,
                    shopId: String(offer.shopId),
                    commissionRate: parseFloat(offer.commissionRate) || null,
                    sales: typeof offer.sales === "number" ? offer.sales : null,
                    ratingStar: parseFloat(offer.ratingStar) || null,
                    discountRate: typeof offer.priceDiscountRate === "number" ? offer.priceDiscountRate : null,
                    priceUpdatedAt: new Date(),
                  },
                });
              }
              grandTotalSkipped++;
              continue;
            }

            // Inserir novo produto com dados oficiais
            const baseData = offerToProductData(offer);
            await prisma.product.create({
              data: {
                ...baseData,
                categoryId: cat.id,
              },
            });

            categoryNewCount++;
            grandTotalImported++;
          }

          // Se a Shopee indicar que não há mais páginas, encerra este termo
          if (!res.pageInfo.hasNextPage) break;

        } catch (termErr: any) {
          console.warn(`Aviso no termo "${term}" pág ${p} para ${cat.name}:`, termErr.message);
        }
      }
    }

    console.log(`[CATEGORIA: ${cat.name}] Concluída: +${categoryNewCount} novos produtos adicionados!`);
  }

  console.log("\n======================================================");
  console.log(`CARGA MASSIVA CONCLUÍDA!`);
  console.log(`Total de novos produtos adicionados: ${grandTotalImported}`);
  console.log(`Total de produtos já existentes / vinculados: ${grandTotalSkipped}`);

  const totalProducts = await prisma.product.count();
  const withApi = await prisma.product.count({ where: { itemId: { not: null } } });

  console.log(`\nTOTAL GERAL DE PRODUTOS NO SITE: ${totalProducts}`);
  console.log(`PRODUTOS COM SHOPEE OPEN API E LINK OFICIAL: ${withApi}`);

  await prisma.$disconnect();
}

importMassiveCatalog();
