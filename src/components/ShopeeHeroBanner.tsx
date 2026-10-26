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
    <div style={{ width: "100%", marginBottom: "1.25rem" }}>
      {/* Banner Principal em Largura Total (100% Width) */}
      <div
        style={{
          width: "100%",
          position: "relative",
          minHeight: "260px",
          borderRadius: "6px",
          overflow: "hidden",
          background: "linear-gradient(135deg, #a70000 0%, #d32f2f 45%, #8b0000 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2rem 3rem",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {/* Botão Slide Anterior */}
        <button
          onClick={prevSlide}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: "36px",
            height: "36px",
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
          <ChevronLeft size={22} />
        </button>

        {/* Botão Próximo Slide */}
        <button
          onClick={nextSlide}
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: "36px",
            height: "36px",
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
          <ChevronRight size={22} />
        </button>

        {/* Conteúdo do Produto em Destaque */}
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", zIndex: 2, maxWidth: "68%" }}>
          <div
            style={{
              width: "160px",
              height: "160px",
              borderRadius: "12px",
              backgroundColor: "rgba(255,255,255,0.15)",
              padding: "8px",
              flexShrink: 0,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <img
              src={current.imageUrl}
              alt={current.productName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(0,0,0,0.3)",
                padding: "4px 12px",
                borderRadius: "100px",
                fontSize: "0.8rem",
                fontWeight: 800,
                marginBottom: "0.6rem",
                color: "#ffeb3b",
                border: "1px solid rgba(255,235,59,0.3)",
              }}
            >
              <Sparkles size={13} /> {current.categoryName.toUpperCase()} • O MAIS PROCURADO
            </div>

            <h2
              style={{
                fontSize: "1.45rem",
                fontWeight: 900,
                lineHeight: 1.25,
                margin: "0 0 0.85rem",
                textShadow: "0 2px 6px rgba(0,0,0,0.4)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {current.productName}
            </h2>

            {/* Caixa de Preço estilo Shopee */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.95rem", textDecoration: "line-through", color: "rgba(255,255,255,0.7)" }}>
                R$ {oldPrice.toFixed(2).replace(".", ",")}
              </span>
              <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                POR <strong style={{ color: "#ffeb3b", fontSize: "1.85rem", fontWeight: 900 }}>R$ {current.price.toFixed(2).replace(".", ",")}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito do Banner: Selo Oficial e Botão Compre Agora */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "14px",
            zIndex: 2,
            textAlign: "right",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(255,255,255,0.18)",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.25)",
              fontSize: "0.82rem",
              fontWeight: 800,
            }}
          >
            <ShieldCheck size={18} color="#4ade80" />
            <span>LOJA OFICIAL VERIFICADA</span>
          </div>

          <a
            href={`/go/${current.productSlug}?origin=hero_banner`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#fff",
              color: "#a70000",
              fontWeight: 900,
              fontSize: "1rem",
              padding: "12px 28px",
              borderRadius: "100px",
              textDecoration: "none",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            <span>Compre agora</span>
            <span>▶</span>
          </a>
        </div>

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
