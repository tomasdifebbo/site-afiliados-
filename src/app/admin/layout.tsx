import { LayoutDashboard, ShoppingBag, FolderOpen, FileText, ChevronLeft, TrendingUp, Video } from "lucide-react";
import { LogoutButton } from "./LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 140px)', backgroundColor: 'hsl(210 40% 98%)' }}>
      {/* Admin Sidebar */}
      <aside style={{ 
        width: '280px', 
        borderRight: '1px solid rgba(0,0,0,0.06)', 
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        backgroundColor: '#fff'
      }}>
        <div style={{ marginBottom: '2rem', padding: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.png"
            alt="Logo Achadinhos do Dia"
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0066FF', boxShadow: '0 0 10px rgba(0, 102, 255, 0.35)', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              Achadinhos<span style={{ color: 'hsl(var(--primary))' }}>doDia</span>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Painel Oficial</div>
          </div>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SidebarLink href="/admin" icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <SidebarLink href="/admin/produtos" icon={<ShoppingBag size={20} />} label="Produtos" />
          <SidebarLink href="/admin/importar" icon={<TrendingUp size={20} />} label="Importar Shopee" />
          <SidebarLink href="/admin/categorias" icon={<FolderOpen size={20} />} label="Categorias" />
          <SidebarLink href="/admin/blog" icon={<FileText size={20} />} label="Blog" />
          <SidebarLink href="/admin/youtube" icon={<Video size={20} />} label="Canal YouTube" />
        </nav>
        
        <div style={{ marginTop: 'auto', padding: '1rem 0.5rem 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '6px 10px', borderRadius: '8px', marginBottom: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }}></span>
            <span>Servidor Ativo (Porta 3000)</span>
          </div>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
            <ChevronLeft size={16} /> Voltar ao Site
          </a>
          <LogoutButton />
        </div>
      </aside>

      {/* Admin Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label, active = false }: { href: string, icon: any, label: string, active?: boolean }) {
  return (
    <a href={href} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      padding: '0.8rem 1rem', 
      borderRadius: '14px', 
      color: active ? 'white' : '#111', 
      fontWeight: active ? 700 : 500,
      backgroundColor: active ? 'hsl(var(--primary))' : 'transparent',
      boxShadow: active ? '0 4px 12px rgba(255, 102, 0, 0.2)' : 'none',
      transition: 'all 0.2s ease'
    }}>
      {icon} {label}
    </a>
  );
}
