const { PrismaClient } = require('@prisma/client');
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
  try {
    await prisma.click.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
  } catch (e) {
    console.log('Initial cleanup failed (probably empty), continuing...');
  }

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
        price: Math.floor(Math.random() * 200) + 20.90,
        affiliateLink: 'https://shope.ee/example',
        imageUrl: `https://picsum.photos/seed/${i + 200}/400/400`,
        categoryId: cat.id,
        isFeatured: i <= 8,
      }
    });
  }

  console.log('Seed: Creating 10 blog posts...');
  for (let i = 1; i <= 10; i++) {
    await prisma.post.create({
      data: {
        title: `Top ${i + 2} Achadinhos para Transformar sua Vida`,
        slug: `top-achadinhos-transformar-vida-${i}`,
        excerpt: 'Descubra como pequenos itens podem economizar seu tempo e dinheiro todos os dias. Uma curadoria exclusiva.',
        content: '<p>Este é o conteúdo do post de blog. Aqui detalhamos as vantagens de cada produto...</p>',
        imageUrl: `https://picsum.photos/seed/${i + 300}/800/400`,
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
