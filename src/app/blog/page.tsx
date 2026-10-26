import { prisma } from "@/lib/prisma";
import { ChevronRight, Calendar, User } from "lucide-react";

export default async function BlogPage() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="container" style={{ padding: '4rem 1.5rem 8rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem' }}>
          Blog <span style={{ color: 'hsl(var(--primary))' }}>Achadinhos</span>
        </h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          Dicas, reviews e guias para você fazer as melhores escolhas em suas compras online.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '3rem' }}>
        {posts.map((post: any) => (
          <article key={post.id} className="glass shadow-premium" style={{ borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <a href={`/blog/${post.slug}`} style={{ display: 'block', aspectRatio: '16/9', overflow: 'hidden' }}>
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </a>
            <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString('pt-BR')}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} /> {post.author}</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', fontFamily: 'var(--font-outfit)', lineHeight: 1.2 }}>
                <a href={`/blog/${post.slug}`}>{post.title}</a>
              </h2>
              <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem', flex: 1, fontSize: '0.95rem' }}>
                {post.excerpt}
              </p>
              <a href={`/blog/${post.slug}`} style={{ color: 'hsl(var(--primary))', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ler Artigo <ChevronRight size={18} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
