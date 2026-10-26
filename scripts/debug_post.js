const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const post = await prisma.post.findFirst({
    where: {
      title: { contains: 'Beleza' }
    }
  });

  if (!post) {
    console.log('Post de Beleza não encontrado');
    return;
  }

  console.log('Post ID:', post.id);
  console.log('Post Title:', post.title);

  const slugs = [];
  const regex = /href="\/go\/([^"?]+)/g;
  let match;
  while ((match = regex.exec(post.content)) !== null) {
    slugs.push(match[1]);
  }

  console.log('Slugs extraídos:', slugs);

  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } }
  });

  console.log('Produtos encontrados:', products.length);
  for (const p of products) {
    console.log(`- [${p.id}] ${p.name}`);
    console.log(`  imageUrl: ${p.imageUrl}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
