import { prisma } from "@/lib/prisma";
import { Plus, FileText, Edit3, Trash2, Eye } from "lucide-react";
import { YouTubeSyncButton } from "./YouTubeSyncButton";

export default async function AdminBlogPage() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ padding: '3rem', color: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>Blog & SEO</h1>
          <p style={{ color: '#555', fontWeight: 500 }}>Gerencie seus artigos, sincronize vídeos do YouTube e aumente suas vendas de afiliado.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '8px', borderRadius: '16px', padding: '1rem 2rem' }}>
          <Plus size={20} /> Novo Artigo
        </button>
      </div>

      <YouTubeSyncButton />

      <div className="grid" style={{ gap: '1.5rem' }}>
        {posts.map((post: any) => (
          <div key={post.id} className="glass shadow-premium" style={{ 
            padding: '1.5rem 2rem', 
            borderRadius: '24px', 
            backgroundColor: '#fff', 
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
              <div style={{ position: 'relative', width: '100px', height: '60px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#eee' }}>
                <img src={post.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem' }}>{post.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>{post.slug}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right', marginRight: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Publicado em</span>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{new Date(post.createdAt).toLocaleDateString()}</div>
              </div>
              <button style={{ padding: '10px', borderRadius: '12px', background: '#f5f5f5', border: 'none', color: '#333' }}><Edit3 size={18} /></button>
              <button style={{ padding: '10px', borderRadius: '12px', background: '#fee2e2', border: 'none', color: '#ef4444' }}><Trash2 size={18} /></button>
              <a href={`/blog/${post.slug}`} target="_blank" style={{ padding: '10px', borderRadius: '12px', background: '#eff6ff', border: 'none', color: '#3b82f6' }}>
                <Eye size={18} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
