import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  metadataBase: new URL("https://achadinhosdodia.com.br"),
  title: "Achadinhos do Dia | Melhores Ofertas Shopee, Amazon e Mais",
  description: "Curadoria diária dos produtos mais úteis, baratos e virais da internet. Economize tempo e dinheiro com nossos achadinhos.",
  keywords: ["ofertas", "achadinhos", "shopee", "promoção", "descontos", "produtos baratos"],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Achadinhos do Dia | Melhores Ofertas Shopee e Mais",
    description: "Curadoria diária dos produtos mais úteis, baratos e virais da internet.",
    images: [{ url: "/logo.png", width: 800, height: 800, alt: "Achadinhos do Dia" }],
  },
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
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, textDecoration: 'none' }}>
              <img
                src="/logo.png"
                alt="Logo Achadinhos do Dia"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #0066FF',
                  boxShadow: '0 0 12px rgba(0, 102, 255, 0.35)',
                  flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <h1 className="header-logo-text" style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.45rem', fontWeight: 900, color: 'hsl(var(--secondary))', margin: 0, letterSpacing: '-0.02em' }}>
                  Achadinhos<span style={{ color: 'hsl(var(--primary))' }}>doDia</span>
                </h1>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ofertas Incríveis
                </span>
              </div>
            </a>

            <nav className="header-nav" style={{ display: 'flex', gap: '2rem', flexShrink: 0 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                  <img
                    src="/logo.png"
                    alt="Logo Achadinhos do Dia"
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #0066FF',
                      boxShadow: '0 0 10px rgba(0, 102, 255, 0.35)',
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-outfit)', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Achadinhos do Dia</h3>
                    <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700 }}>Tudo o que você precisa em um só lugar</span>
                  </div>
                </div>
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
