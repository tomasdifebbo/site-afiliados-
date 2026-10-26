import { prisma } from "@/lib/prisma";
import { LayoutDashboard, ShoppingBag, FolderOpen, FileText, MousePointerClick, ArrowUpRight } from "lucide-react";
import { ShopeeReportCard } from "./ShopeeReportCard";

export default async function AdminDashboard() {
  const [productCount, categoryCount, postCount, totalClicks, topProducts] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.post.count(),
    prisma.click.count(),
    prisma.product.findMany({
      include: {
        _count: {
          select: { clicks: true }
        },
        category: true
      },
      orderBy: {
        clicks: {
          _count: 'desc'
        }
      },
      take: 5
    })
  ]);

  const stats = [
    { name: "Produtos", value: productCount, icon: ShoppingBag, color: "var(--primary)" },
    { name: "Categorias", value: categoryCount, icon: FolderOpen, color: "var(--secondary)" },
    { name: "Posts Blog", value: postCount, icon: FileText, color: "#9c27b0" },
    { name: "Total Cliques", value: totalClicks, icon: MousePointerClick, color: "#10b981" },
  ];

  return (
    <div style={{ padding: '3rem', backgroundColor: 'hsl(var(--background))', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #FF8C00 100%)', 
            padding: '12px', 
            borderRadius: '16px', 
            color: 'white',
            boxShadow: '0 4px 12px rgba(255, 102, 0, 0.2)' 
          }}>
            <LayoutDashboard size={28} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2.5rem', fontWeight: 800, color: '#000', margin: 0 }}>Dashboard</h1>
            <p style={{ color: '#555', fontWeight: 500 }}>Bem-vindo de volta ao seu centro de comando.</p>
          </div>
        </div>
      </div>

      {/* Relatório Oficial Shopee Open API */}
      <ShopeeReportCard />

      {/* Stats Grid - Bento Style */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        {stats.map((stat) => (
          <div key={stat.name} className="glass" style={{ 
            padding: '2rem', 
            borderRadius: '28px', 
            border: '1px solid rgba(0,0,0,0.05)',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <div style={{ 
                 backgroundColor: `${stat.color}15`, 
                 color: stat.color, 
                 padding: '10px', 
                 borderRadius: '12px' 
               }}>
                 <stat.icon size={24} />
               </div>
               <span style={{ fontSize: '0.75rem', color: '#000', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Métricas</span>
            </div>
            <div style={{ fontSize: '2.75rem', fontWeight: 900, marginBottom: '0.25rem', color: '#000' }}>{stat.value}</div>
            <div style={{ color: '#333', fontWeight: 700, fontSize: '1.1rem' }}>{stat.name}</div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Top Products */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: '#000' }}>Produtos Mais Populares</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topProducts.map((product) => (
              <div key={product.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '1rem', 
                borderRadius: '20px', 
                backgroundColor: 'rgba(0,0,0,0.02)',
                border: '1px solid rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={product.imageUrl} style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 800, color: '#000' }}>{product.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#555', fontWeight: 600 }}>{product.category.name}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'hsl(var(--primary))' }}>{product._count.clicks}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Cliques</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <a href="/admin/importar" className="glass" style={{ 
            padding: '2rem', 
            borderRadius: '28px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            background: 'linear-gradient(135deg, #fff 0%, #f9f9f9 100%)'
          }}>
            <div style={{ backgroundColor: '#10b98120', color: '#10b981', padding: '12px', borderRadius: '15px', width: 'fit-content' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#000' }}>Importador Shopee</div>
              <p style={{ fontSize: '0.9rem', color: '#555', marginTop: '4px' }}>Adicione ofertas em massa em segundos.</p>
            </div>
          </a>
          
          <a href="/admin/produtos" className="glass" style={{ 
            padding: '2rem', 
            borderRadius: '28px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem'
          }}>
            <div style={{ backgroundColor: 'hsl(var(--primary))15', color: 'hsl(var(--primary))', padding: '12px', borderRadius: '15px', width: 'fit-content' }}>
              <ShoppingBag size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#000' }}>Estoque & Preços</div>
              <p style={{ fontSize: '0.9rem', color: '#555', marginTop: '4px' }}>Gerencie seu catálogo completo.</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

// Custom TrendingUp Icon helper
function TrendingUp({ size }: { size: number }) {
  return <MousePointerClick size={size} />;
}
