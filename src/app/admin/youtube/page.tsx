import { prisma } from "@/lib/prisma";
import { YouTubeScriptGenerator } from "./YouTubeScriptGenerator";

export default async function YouTubeAdminPage() {
  const [posts, categories] = await Promise.all([
    prisma.post.findMany({
      select: { id: true, title: true, slug: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <YouTubeScriptGenerator posts={posts} categories={categories} />;
}
