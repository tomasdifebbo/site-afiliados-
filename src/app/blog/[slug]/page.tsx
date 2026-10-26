import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, User, Share2 } from "lucide-react";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });
  
  if (!post) return { title: "Post não encontrado" };

  return {
    title: `${post.title} | Blog Achadinhos`,
    description: post.excerpt,
    openGraph: {
      images: [post.imageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug }
  });

  if (!post) notFound();

  return (
    <article style={{ paddingBottom: '8rem' }}>
      <header style={{ 
        padding: '6rem 0 4rem', 
        background: 'linear-gradient(180deg, hsl(210 40% 96%) 0%, transparent 100%)',
        textAlign: 'center'
      }}>
        <div className="container">
          <a href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--muted-foreground))', marginBottom: '2rem', fontWeight: 500 }}>
            <ArrowLeft size={18} /> Voltar ao Blog
          </a>
          <h1 style={{ 
            fontFamily: 'var(--font-outfit)', 
            fontSize: 'max(2.2rem, 3.5vw)', 
            fontWeight: 800, 
            lineHeight: 1.1,
            maxWidth: '800px',
            margin: '0 auto 1.5rem'
          }}>
            {post.title}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'hsl(var(--muted-foreground))' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={18} /> {new Date(post.createdAt).toLocaleDateString('pt-BR')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={18} /> {post.author}</span>
          </div>
        </div>
      </header>

      <div className="container" style={{ marginTop: '-2rem', marginBottom: '4rem' }}>
        <div className="glass shadow-premium" style={{ borderRadius: '32px', overflow: 'hidden', aspectRatio: '21/9' }}>
          <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      <div className="container" style={{ maxWidth: '960px' }}>
        <div 
          className="blog-content" 
          style={{ 
            fontSize: '1.15rem', 
            lineHeight: 1.8, 
            color: 'hsl(var(--foreground))' 
          }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        <div style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'center' }}>
          <button className="btn btn-secondary" style={{ gap: '8px' }}>
            <Share2 size={18} /> Compartilhar este artigo
          </button>
        </div>
      </div>
    </article>
  );
}
