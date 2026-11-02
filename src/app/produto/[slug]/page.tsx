import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ShoppingBag, CheckCircle2, Share2, ArrowLeft, Star, Flame, Tag, ShieldCheck } from "lucide-react";
import { Metadata } from "next";
import PriceCompare from "@/components/PriceCompare";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, include: { category: true } });
  
  if (!product) return { title: "Produto não encontrado" };

  return {
    title: `${product.name} | Achadinhos do Dia`,
    description: product.description,
    openGraph: {
      images: [product.imageUrl],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true }
  });

  if (!product) notFound();

  return (
    <div className="container page-container">
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--muted-foreground))', marginBottom: '2rem', fontWeight: 500 }}>
        <ArrowLeft size={18} /> Voltar para o Início
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
        {/* Gallery Placeholder */}
        <div className="animate-fade-in">
          <div className="glass shadow-premium" style={{ borderRadius: '24px', overflow: 'hidden', backgroundColor: '#f9f9f9', position: 'relative' }}>
            <img src={product.imageUrl} alt={product.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
            {product.discountRate ? (
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                }}
              >
                -{product.discountRate}% OFF
              </div>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ backgroundColor: 'rgba(33, 150, 243, 0.1)', color: 'hsl(var(--secondary))', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700 }}>
              {product.category.name}
            </span>

            {product.ratingStar ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800 }}>
                <Star size={13} fill="#f59e0b" color="#f59e0b" /> {product.ratingStar.toFixed(1)} de avaliação
              </span>
            ) : null}

            {product.sales ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fff7ed', color: '#c2410c', padding: '4px 10px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800 }}>
                <Flame size={13} /> {product.sales.toLocaleString('pt-BR')} vendidos
              </span>
            ) : null}
          </div>

          <h1 style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(1.6rem, 5vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.15 }}>
            {product.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', padding: '1.5rem', borderRadius: '16px', flex: 1 }}>
              <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>Melhor oferta hoje:</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'hsl(var(--foreground))' }}>
                {product.price ? `R$ ${product.price.toFixed(2).replace('.', ',')}` : "Ver na loja"}
              </div>
              {product.priceUpdatedAt && (
                <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} /> Preço verificado via Shopee Open API
                </div>
              )}
            </div>
          </div>

          {product.mlPrice && (product.mlLink || product.mlAffiliateLink) && product.price ? (
            <div style={{ marginBottom: '0.8rem' }}>
              <div style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Compare antes de comprar:</div>
              <PriceCompare slug={product.slug} origin="product_page" shopeePrice={product.price} mlPrice={product.mlPrice} size="large" />
            </div>
          ) : (
          <a href={`/go/${product.slug}?origin=product_page`} target="_blank" className="btn btn-primary" style={{ width: '100%', padding: '1.4rem', fontSize: '1.15rem', marginBottom: '0.8rem', gap: '12px' }}>
            Ver Oferta na Shopee <ShoppingBag size={22} />
          </a>
          )}
          <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', textAlign: 'center', marginBottom: '2rem' }}>
            🔒 Você será direcionado para a loja oficial do vendedor na Shopee. Pagamento e entrega 100% protegidos pela Garantia Shopee.
          </p>

          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Por que amamos este item?</h3>
            <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} color="green" /> <span>Custo-benefício imbatível para sua categoria.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} color="green" /> <span>Qualidade testada e recomendada pela nossa equipe.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} color="green" /> <span>Ideal para quem busca praticidade no dia a dia.</span>
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1, gap: '8px' }}>
              <Share2 size={18} /> Compartilhar
            </button>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div style={{ marginTop: '6rem', maxWidth: '800px' }}>
        <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>Descrição Detalhada</h2>
        <p style={{ fontSize: '1.05rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.7 }}>
          {product.description}
          <br /><br />
          <strong>Transparência e Afiliados:</strong> Selecionamos e recomendamos os melhores achadinhos da internet. Ao comprar por meio de nossos links, podemos receber uma comissão de afiliado oficial sem nenhum acréscimo no valor que você paga. Os preços, cupons e estoques são dinâmicos e definidos pelos lojistas na Shopee.
        </p>
      </div>
    </div>
  );
}
