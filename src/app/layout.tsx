import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Achadinhos do Dia | Melhores Ofertas Shopee, Amazon e Mais",
  description: "Curadoria diária dos produtos mais úteis, baratos e virais da internet. Economize tempo e dinheiro com nossos achadinhos.",
  keywords: ["ofertas", "achadinhos", "shopee", "promoção", "descontos", "produtos baratos"],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <header className="glass shadow-premium" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="container" style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '38px', height: '38px', backgroundColor: 'hsl(var(--primary))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: '1.4rem' }}>A</span>
              </div>
              <h1 className="header-logo-text" style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--secondary))', margin: 0 }}>
                Achadinhos<span style={{ color: 'hsl(var(--primary))' }}>doDia</span>
              </h1>
            </a>
            
            <nav className="header-nav" style={{ display: 'flex', gap: '2rem' }}>
              <a href="/" style={{ fontWeight: 600 }}>Home</a>
              <a href="/categorias" style={{ fontWeight: 600 }}>Categorias</a>
              <a href="/blog" style={{ fontWeight: 600 }}>Blog</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer style={{ backgroundColor: 'hsl(var(--card))', borderTop: '1px solid hsl(var(--border))', padding: '4rem 0 2rem' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-outfit)', marginBottom: '1rem' }}>Achadinhos do Dia</h3>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
                  Sua curadoria diária de produtos incríveis com os melhores preços da internet.
                </p>
              </div>
              <div>
                <h4 style={{ marginBottom: '1rem' }}>Links Úteis</h4>
                <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <li><a href="/sobre">Sobre Nós</a></li>
                  <li><a href="/privacidade">Política de Privacidade</a></li>
                  <li><a href="/termos">Termos de Uso</a></li>
                </ul>
              </div>
              <div>
                <h4 style={{ marginBottom: '1rem' }}>Redes Sociais</h4>
                <ul style={{ listStyle: 'none', display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <li><a href="#">Instagram</a></li>
                  <li><a href="#">TikTok</a></li>
                </ul>
              </div>
            </div>
            <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
              <p style={{ maxWidth: '850px', margin: '0 auto', lineHeight: 1.6 }}>
                <strong>Aviso de Isenção e Afiliados:</strong> O Achadinhos do Dia é um portal independente de conteúdo e curadoria de ofertas. Participamos do Programa de Afiliados da Shopee e de outras plataformas parceiras. Isso significa que podemos receber uma pequena comissão caso você realize uma compra através dos nossos links recomendados, sem nenhum custo extra para você. Os preços, condições de frete, disponibilidade de estoque e garantias são de responsabilidade exclusiva dos lojistas e da plataforma oficial da Shopee, podendo sofrer alterações a qualquer momento.
              </p>
              <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Shopee é uma marca registrada de sua respectiva proprietária. Este site não é afiliado institucionalmente à Shopee além da participação no programa de marketing de afiliados oficial.
              </p>
              <div>
                © {new Date().getFullYear()} Achadinhos do Dia. Todos os direitos reservados.
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
