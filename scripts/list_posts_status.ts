import { prisma } from "../src/lib/prisma";

async function main() {
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "asc" } });
  for (const p of posts) {
    const hasProducts = p.content.includes("Ver Oferta na Shopee") || p.content.includes("/go/");
    const hasBanner = p.content.includes("Curadoria Exclusiva");
    console.log(JSON.stringify({ id: p.id, title: p.title.slice(0, 70), slug: p.slug, hasProducts, hasBanner, contentLen: p.content.length }));
  }
  await prisma.$disconnect();
}
main().catch(console.error);
