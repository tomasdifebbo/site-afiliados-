import { prisma } from "@/lib/prisma";
import { Plus, FolderOpen, Edit3, Trash2, Zap } from "lucide-react";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div style={{ padding: '3rem', color: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800 }}>Categorias</h1>
          <p style={{ color: '#555', fontWeight: 500 }}>Organize seus achadinhos em nichos de mercado.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: '8px', borderRadius: '16px', padding: '1rem 2rem' }}>
          <Plus size={20} /> Nova Categoria
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
        {categories.map((cat: any) => (
          <div key={cat.id} className="glass shadow-premium" style={{ 
            padding: '2.5rem', 
            borderRadius: '28px', 
            backgroundColor: '#fff', 
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'transform 0.2s ease',
          }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              backgroundColor: 'rgba(255, 102, 0, 0.1)', 
              color: 'hsl(var(--primary))',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <FolderOpen size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{cat.name}</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', fontWeight: 600, marginBottom: '1rem' }}>{cat._count.products} produtos cadastrados</p>
            
            {cat.affiliateLink && (
              <div style={{ 
                backgroundColor: '#10b981', 
                color: '#fff', 
                fontSize: '0.7rem', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 900,
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Zap size={12} fill="white" /> AFILIADO ATIVO
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: 'auto' }}>
              <button style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: '#f5f5f5', border: 'none', color: '#333', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Edit3 size={16} /> Editar</button>
              <button style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: '#fee2e2', border: 'none', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Trash2 size={16} /> Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
