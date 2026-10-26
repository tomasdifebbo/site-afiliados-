import { prisma } from "@/lib/prisma";
import { FolderOpen, ChevronRight } from "lucide-react";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    },
    orderBy: [
      { products: { _count: 'desc' } },
      { name: 'asc' }
    ]
  });

  return (
    <div className="container" style={{ padding: '4rem 1.5rem 8rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.15 }}>
          Explore por <span style={{ color: 'hsl(var(--primary))' }}>Categorias</span>
        </h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          Encontre os melhores achadinhos organizados pelos nichos que você mais ama.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.2rem' }}>
        {categories.map((cat: any) => (
          <a 
            key={cat.id} 
            href={`/categoria/${cat.slug}`} 
            className="glass shadow-premium" 
            style={{ 
              padding: '1.4rem', 
              borderRadius: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                backgroundColor: 'rgba(255, 102, 0, 0.1)', 
                color: 'hsl(var(--primary))',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FolderOpen size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{cat.name}</h3>
                <p style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>{cat._count.products} produtos encontrados</p>
              </div>
            </div>
            <ChevronRight size={24} style={{ color: 'hsl(var(--muted-foreground))' }} />
          </a>
        ))}
      </div>
    </div>
  );
}
