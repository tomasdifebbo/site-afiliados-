import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Cozinha & Gastronomia', slug: 'cozinha-gastronomia' },
    { name: 'Gadgets & Tech', slug: 'gadgets-tech' },
    { name: 'Casa & Decoração', slug: 'casa-decoracao' },
    { name: 'Beleza & Cuidados', slug: 'beleza-cuidados' },
    { name: 'Kids & Brinquedos', slug: 'kids-brinquedos' },
  ];

  console.log('Seed: Deleting existing data...');
  await prisma.click.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  console.log('Seed: Creating categories...');
  const createdCategories = [];
  for (const cat of categories) {
    const c = await prisma.category.create({ data: cat });
    createdCategories.push(c);
  }

  console.log('Seed: Creating 30 products...');
  for (let i = 1; i <= 30; i++) {
    const cat = createdCategories[Math.floor(Math.random() * createdCategories.length)];
    await prisma.product.create({
      data: {
        name: `Produto Incrível Achado #${i}`,
        slug: `produto-achado-${i}`,
        description: 'Um produto muito útil que vai facilitar sua vida no dia a dia. Testado e aprovado pela nossa equipe de especialistas.',
        price: Math.random() * 200 + 20,
        affiliateLink: 'https://shope.ee/example',
        imageUrl: `https://picsum.photos/seed/${i + 100}/400/400`,
        categoryId: cat.id,
        isFeatured: i <= 8,
      }
    });
  }

  console.log('Seed finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
