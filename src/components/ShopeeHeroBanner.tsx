"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export interface CategoryTopProduct {
  categoryName: string;
  categorySlug: string;
  productName: string;
  productSlug: string;
  price: number;
  imageUrl: string;
  sales?: number | null;
  ratingStar?: number | null;
  discountRate?: number | null;
}

interface ShopeeHeroBannerProps {
  topProductsByCategory: CategoryTopProduct[];
}

export function ShopeeHeroBanner({ topProductsByCategory }: ShopeeHeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Troca automática de banner a cada 4.5 segundos
  useEffect(() => {
    if (!topProductsByCategory || topProductsByCategory.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % topProductsByCategory.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [topProductsByCategory]);

  if (!topProductsByCategory || topProductsByCategory.length === 0) return null;

  const current = topProductsByCategory[currentIndex];
  const oldPrice = current.price * (1 + (current.discountRate || 25) / 100);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? topProductsByCategory.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % topProductsByCategory.length);
  };

  return (
    <div style={{ width: "100%", marginBottom: "1rem" }}>
      {/* Banner Principal em Largura Total (100% Width) */}
      <div className="shopee-hero-container">
        {/* Conteúdo Responsivo do Banner */}
        <div className="shopee-hero-inner">
          {/* Produto em Destaque */}
          <div className="shopee-hero-product">
            <div className="shopee-hero-img-box">
              <img
                src={current.imageUrl}
                alt={current.productName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="shopee-hero-badge">
                <Sparkles size={12} />
                <span>{current.categoryName.toUpperCase()} • DESTAQUE</span>
              </div>

              <h2 className="shopee-hero-title">
                {current.productName}
              </h2>

              {/* Caixa de Preço estilo Shopee */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.85rem", textDecoration: "line-through", color: "rgba(255,255,255,0.7)" }}>
                  R$ {oldPrice.toFixed(2).replace(".", ",")}
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
                  POR <strong style={{ color: "#ffeb3b", fontSize: "1.4rem", fontWeight: 900 }}>R$ {current.price.toFixed(2).replace(".", ",")}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Ações: Selo Oficial e Botão Compre Agora */}
          <div className="shopee-hero-actions">
            <div className="shopee-hero-verified">
              <ShieldCheck size={16} color="#4ade80" />
              <span>LOJA OFICIAL VERIFICADA</span>
            </div>

            <a
              href={`/go/${current.productSlug}?origin=hero_banner`}
              target="_blank"
              rel="noopener noreferrer"
              className="shopee-hero-btn"
            >
              <span>Compre agora</span>
              <span>▶</span>
            </a>
          </div>
        </div>

        {/* Botão Slide Anterior (Desktop) */}
        <button
          onClick={prevSlide}
          style={{
            position: "absolute",
            left: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          title="Anterior"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Botão Próximo Slide (Desktop) */}
        <button
          onClick={nextSlide}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          title="Próximo"
        >
          <ChevronRight size={18} />
        </button>

        {/* Pontinhos de Paginação do Carrossel */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "8px",
            zIndex: 3,
          }}
        >
          {topProductsByCategory.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: currentIndex === idx ? "26px" : "8px",
                height: "8px",
                borderRadius: "4px",
                backgroundColor: currentIndex === idx ? "#ffeb3b" : "rgba(255,255,255,0.45)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.25s ease",
              }}
              title={`Ir para categoria ${topProductsByCategory[idx].categoryName}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
