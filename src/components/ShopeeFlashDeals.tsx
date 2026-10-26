"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronRight, ChevronLeft, Flame } from "lucide-react";

export interface FlashDealProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  discountRate?: number | null;
  sales?: number | null;
}

interface ShopeeFlashDealsProps {
  products: FlashDealProduct[];
}

export function ShopeeFlashDeals({ products }: ShopeeFlashDealsProps) {
  // Bloco de 2 horas atual (0 a 11 ao longo das 24h do dia)
  const [slotIndex, setSlotIndex] = useState(() => Math.floor(new Date().getHours() / 2));

  // Timer regressivo dinâmico que reseta a cada 2 horas sincronizado com a virada do lote
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: "01",
    minutes: "59",
    seconds: "59",
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Rotação dinâmica: a cada 2 horas o conjunto de produtos exibidos troca automaticamente
  const displayedProducts = useMemo(() => {
    if (!products || products.length <= 6) return products;
    // Pula 6 itens por bloco de 2h, fazendo com que a vitrine sempre mostre novidades
    const offset = (slotIndex * 6) % products.length;
    const rotated = [...products.slice(offset), ...products.slice(0, offset)];
    return rotated;
  }, [products, slotIndex]);

  useEffect(() => {
    // Calcula tempo restante até a próxima virada de lote (a cada 2 horas cravadas)
    const updateTimer = () => {
      const now = new Date();
      const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const slotSeconds = 2 * 3600; // ciclos de exatamente 2 HORAS
      const remainingSeconds = slotSeconds - (currentSeconds % slotSeconds);

      // Atualiza o slot caso tenha virado as 2 horas
      const currentSlot = Math.floor(now.getHours() / 2);
      setSlotIndex((prev) => (prev !== currentSlot ? currentSlot : prev));

      const h = Math.floor(remainingSeconds / 3600);
      const m = Math.floor((remainingSeconds % 3600) / 60);
      const s = remainingSeconds % 60;

      setTimeLeft({
        hours: String(h).padStart(2, "0"),
        minutes: String(m).padStart(2, "0"),
        seconds: String(s).padStart(2, "0"),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 600;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  if (!products || products.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: "4px",
        marginBottom: "1.5rem",
        boxShadow: "0 1px 4px 0 rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      {/* Header Ofertas Relâmpago Clone Shopee */}
      <div className="flash-deals-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                color: "#ee4d2d",
                fontWeight: 900,
                fontSize: "1.1rem",
                letterSpacing: "-0.5px",
                textTransform: "uppercase",
                fontFamily: "var(--font-outfit), sans-serif",
              }}
            >
              OFERTAS
            </span>
            <span
              style={{
                backgroundColor: "#ee4d2d",
                color: "#fff",
                fontWeight: 900,
                fontSize: "0.8rem",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              %
            </span>
            <span
              style={{
                color: "#ee4d2d",
                fontWeight: 900,
                fontSize: "1.1rem",
                letterSpacing: "-0.5px",
                textTransform: "uppercase",
                fontFamily: "var(--font-outfit), sans-serif",
              }}
            >
              RELÂMPAGO
            </span>
          </div>

          {/* Timer Regressivo Caixinhas Pretas */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                backgroundColor: "#000",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.85rem",
                padding: "3px 6px",
                borderRadius: "3px",
                minWidth: "26px",
                textAlign: "center",
              }}
            >
              {timeLeft.hours}
            </span>
            <span style={{ fontWeight: 800, color: "#000", fontSize: "0.9rem" }}>:</span>
            <span
              style={{
                backgroundColor: "#000",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.85rem",
                padding: "3px 6px",
                borderRadius: "3px",
                minWidth: "26px",
                textAlign: "center",
              }}
            >
              {timeLeft.minutes}
            </span>
            <span style={{ fontWeight: 800, color: "#000", fontSize: "0.9rem" }}>:</span>
            <span
              style={{
                backgroundColor: "#000",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.85rem",
                padding: "3px 6px",
                borderRadius: "3px",
                minWidth: "26px",
                textAlign: "center",
              }}
            >
              {timeLeft.seconds}
            </span>
          </div>
        </div>

        <a
          href="/categorias"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
            color: "#ee4d2d",
            fontSize: "0.88rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          <span>Ver Tudo</span>
          <ChevronRight size={16} />
        </a>
      </div>

      {/* Carrossel Deslizável de Produtos */}
      <div style={{ position: "relative", padding: "1rem 0.5rem" }}>
        {/* Botão Scroll Esquerda */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll("left")}
            style={{
              position: "absolute",
              left: "8px",
              top: "45%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.95)",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Botão Scroll Direita */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll("right")}
            style={{
              position: "absolute",
              right: "8px",
              top: "45%",
              transform: "translateY(-50%)",
              zIndex: 10,
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.95)",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Trilha de Cards */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          style={{
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            scrollBehavior: "smooth",
            padding: "0.25rem 0.5rem",
            scrollbarWidth: "none",
          }}
        >
          {displayedProducts.map((item, idx) => {
            const discount = item.discountRate || Math.floor(Math.random() * 35) + 20;
            const progressPercent = Math.min(95, Math.max(35, (item.sales ? item.sales % 70 : (idx * 17) % 80) + 20));
            const progressLabel =
              progressPercent > 80
                ? "ESGOTANDO"
                : progressPercent > 50
                ? "POPULAR"
                : `${item.sales ? Math.min(item.sales, 89) : 12} ITENS VENDIDOS`;

            return (
              <a
                key={item.id}
                href={`/go/${item.slug}?origin=flash_deals`}
                target="_blank"
                rel="noopener noreferrer"
                className="flash-deal-card"
              >
                {/* Imagem com Selos Clone Shopee */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", backgroundColor: "#f9fafb" }}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />

                  {/* Tag "Indicado" Laranja no canto esquerdo */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      backgroundColor: "#ee4d2d",
                      color: "#fff",
                      fontSize: "0.62rem",
                      fontWeight: 800,
                      padding: "2px 5px",
                      borderBottomRightRadius: "3px",
                    }}
                  >
                    Indicado
                  </div>

                  {/* Tag Desconto Amarela no canto direito */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: "rgba(255,212,36,0.95)",
                      color: "#ee4d2d",
                      fontSize: "0.65rem",
                      fontWeight: 900,
                      padding: "2px 4px",
                      textAlign: "center",
                      lineHeight: 1.1,
                    }}
                  >
                    <div>-{discount}%</div>
                  </div>
                </div>

                {/* Preço em Destaque Vermelho/Laranja */}
                <div style={{ padding: "0.75rem 0.5rem 0.5rem", textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 900,
                      color: "#ee4d2d",
                      marginBottom: "6px",
                    }}
                  >
                    R$ {item.price.toFixed(2).replace(".", ",")}
                  </div>

                  {/* Barra de Fogo com Progresso */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "17px",
                      borderRadius: "10px",
                      backgroundColor: "#ffbda6",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Preenchimento com gradiente de fogo */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${progressPercent}%`,
                        background: "linear-gradient(90deg, #ff5722 0%, #ee4d2d 100%)",
                        borderRadius: "10px",
                      }}
                    />

                    {/* Texto com Foguinho Sobreposto */}
                    <span
                      style={{
                        position: "relative",
                        zIndex: 2,
                        fontSize: "0.62rem",
                        fontWeight: 900,
                        color: "#fff",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <Flame size={11} fill="#fff" />
                      {progressLabel}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
