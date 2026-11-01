"use client";

import { useState, useEffect } from "react";
import { getShopeeBookmarkletCode } from "@/lib/shopeeBookmarklet";
import {
  Sparkles,
  Film,
  Play,
  CheckCircle,
  RefreshCw,
  Download,
  Copy,
  Check,
  Flame,
  TrendingUp,
  Zap,
  Search,
  Video,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Tag,
  ShoppingBag,
  Trash2,
  Clock,
  AlertTriangle
} from "lucide-react";

interface ProductItem {
  itemId: string | number;
  shopId: string | number;
  productName: string;
  price: string | number;
  imageUrl: string;
  sales?: number;
  priceDiscountRate?: number;
  discountRate?: number;
  productLink?: string;
  offerLink?: string;
  videoUrl?: string | null;
}

interface SavedVideo {
  id: string;
  productName: string;
  price?: number | null;
  affiliateLink?: string | null;
  imageUrl?: string | null;
  sellerVideoUrl?: string | null;
  videoUrl?: string | null;
  scriptText?: string | null;
  captionText?: string | null;
  status: string;
  createdAt: string;
}

const TRENDING_TABS = [
  { id: "top_geral", label: "🔥 Top Mais Vendidos Shopee", keyword: "" },
  { id: "tecnologia", label: "📱 Tecnologia & Gadgets", keyword: "tecnologia utilidades" },
  { id: "casa", label: "🏠 Casa & Organização", keyword: "casa utilidades organizador" },
  { id: "cozinha", label: "🍳 Cozinha Inteligente", keyword: "cozinha praticidade" },
  { id: "beleza", label: "💄 Beleza & Cuidado", keyword: "beleza maquiagem skincare" },
];

export function DarkVideoPipeline() {
  // Controle do Passo Ativo (1 a 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // ── PASSO 1: Busca e Seleção de Mais Vendidos ──
  const [activeTab, setActiveTab] = useState("top_geral");
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingProducts, setTrendingProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // ── PASSO 2: Vídeo do Vendedor Shopee ──
  const [extractingVideo, setExtractingVideo] = useState(false);
  const [sellerVideoUrl, setSellerVideoUrl] = useState<string | null>(null);
  const [availableVideos, setAvailableVideos] = useState<Array<{ url: string; title: string; type: string; rating?: number }>>([]);
  const [customVideoUrlInput, setCustomVideoUrlInput] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  // ── PASSO 3: Narrativa Detalhada com Gemini AI ──
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptText, setScriptText] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);

  // ── PASSO 4: Gerador de Vídeo Final ──
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState("");
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  // ── Histórico de Vídeos Gerados ──
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Carregar produtos mais vendidos no passo 1
  const fetchTrendingProducts = async (keyword?: string) => {
    setLoadingProducts(true);
    try {
      const url = keyword?.trim()
        ? `/api/admin/shopee/search?keyword=${encodeURIComponent(keyword.trim())}&sortType=2&limit=24`
        : `/api/admin/shopee/search?sortType=2&limit=24`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.nodes) {
        setTrendingProducts(data.nodes);
      }
    } catch (e: any) {
      console.error("Erro ao buscar mais vendidos:", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchTrendingProducts();
    fetchSavedVideos();

    // Se a página foi aberta com parâmetros de vídeo da Shopee (via Bookmarklet)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlVideo = params.get("videoUrl");
      const pName = params.get("productName");
      const pPrice = params.get("price");
      const pImg = params.get("imageUrl");
      const pLink = params.get("affiliateLink");

      if (urlVideo) {
        setSellerVideoUrl(urlVideo);
        setAvailableVideos([
          { url: urlVideo, title: "Vídeo Puxado da Shopee (Galeria/Comentário)", type: "shopee" }
        ]);
        if (pName) {
          setSelectedProduct({
            productName: pName,
            price: pPrice || "0",
            imageUrl: pImg || "",
            productLink: pLink || "",
            itemId: "puxado-" + Date.now(),
            shopId: "shopee",
          });
          setCurrentStep(2);
        }
      }
    }
  }, []);

  const handleTabChange = (tab: typeof TRENDING_TABS[0]) => {
    setActiveTab(tab.id);
    setSearchQuery("");
    fetchTrendingProducts(tab.keyword);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchTrendingProducts(searchQuery.trim());
    }
  };

  // Carregar histórico de vídeos
  const fetchSavedVideos = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch("/api/admin/dark-video/queue?status=todos");
      const data = await res.json();
      if (data.items) {
        setSavedVideos(data.items);
      }
    } catch {}
    setLoadingSaved(false);
  };

  // ── AÇÃO: Selecionar Produto (Vai para Passo 2) ──
  const handleSelectProduct = async (prod: ProductItem) => {
    setSelectedProduct(prod);
    setSellerVideoUrl(prod.videoUrl || null);
    if (prod.videoUrl) {
      setAvailableVideos([{ url: prod.videoUrl, title: "Vídeo do Produto", type: "gallery" }]);
    } else {
      setAvailableVideos([]);
    }
    setCurrentStep(2);

    // Se já não tiver vídeo, tenta extrair imediatamente
    if (!prod.videoUrl) {
      extractSellerVideoForProduct(prod);
    }
  };

  // ── Extrair Vídeo do Vendedor (Passo 2) ──
  const extractSellerVideoForProduct = async (prod: ProductItem) => {
    setExtractingVideo(true);
    setSellerVideoUrl(null);
    setAvailableVideos([]);
    try {
      const targetUrl = prod.offerLink || prod.productLink || `https://shopee.com.br/product/${prod.shopId}/${prod.itemId}`;
      const res = await fetch("/api/admin/shopee/extract-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setSellerVideoUrl(data.videoUrl);
        if (data.allVideos && data.allVideos.length > 0) {
          setAvailableVideos(data.allVideos);
        } else {
          setAvailableVideos([{ url: data.videoUrl, title: "Vídeo Principal da Shopee", type: "gallery" }]);
        }
      }
    } catch (e: any) {
      console.warn("Vídeo não encontrado na Shopee:", e.message);
    } finally {
      setExtractingVideo(false);
    }
  };

  // Extrair vídeo a partir de URL manual colada
  const handleExtractManualUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVideoUrlInput.trim()) return;
    setExtractingVideo(true);
    try {
      const res = await fetch("/api/admin/shopee/extract-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: customVideoUrlInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setSellerVideoUrl(data.videoUrl);
        if (data.allVideos && data.allVideos.length > 0) {
          setAvailableVideos(data.allVideos);
        } else {
          setAvailableVideos([{ url: data.videoUrl, title: "Vídeo Principal da Shopee", type: "gallery" }]);
        }
      } else {
        alert("Nenhum vídeo do vendedor ou de comentário encontrado para este link.");
      }
    } catch (e: any) {
      alert("Erro ao extrair vídeo: " + e.message);
    } finally {
      setExtractingVideo(false);
    }
  };

  // Upload direto de arquivo de vídeo do computador
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/video/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setSellerVideoUrl(data.videoUrl);
      } else {
        throw new Error(data.error || "Falha no envio do vídeo");
      }
    } catch (err: any) {
      alert("Erro ao enviar vídeo: " + err.message);
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  };

  // ── Gerar Narrativa com Gemini AI (Passo 3) ──
  const handleGenerateGeminiNarrative = async () => {
    if (!selectedProduct) return;
    setGeneratingScript(true);
    setNarrationAudioUrl(null);
    try {
      const res = await fetch("/api/admin/dark-video/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct.productName,
          price: Number(selectedProduct.price) || null,
          categoryName: "Achadinhos Shopee",
          withAudio: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScriptText(data.script || "");
        setCaptionText(data.caption || "");
        if (data.audioUrl) {
          setNarrationAudioUrl(data.audioUrl);
        }
      } else {
        throw new Error(data.error || "Erro ao gerar narrativa");
      }
    } catch (e: any) {
      alert("Falha ao gerar roteiro com Gemini AI: " + e.message);
    } finally {
      setGeneratingScript(false);
    }
  };

  // Gerar ou regravar apenas o áudio para o texto editado
  const handleRegenerateAudio = async () => {
    if (!scriptText.trim()) return;
    setGeneratingAudio(true);
    try {
      const res = await fetch("/api/admin/dark-video/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct?.productName || "Achadinho",
          withAudio: true,
        }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setNarrationAudioUrl(data.audioUrl);
      }
    } catch (e: any) {
      alert("Erro ao sintetizar áudio: " + e.message);
    } finally {
      setGeneratingAudio(false);
    }
  };

  // Quando avança para o Passo 3, gera a narrativa automaticamente se estiver vazia
  const handleGoToStep3 = () => {
    setCurrentStep(3);
    if (!scriptText && selectedProduct) {
      handleGenerateGeminiNarrative();
    }
  };

  // ── Renderizar Vídeo Final para Shorts, TikTok e Kwai (Passo 4) ──
  const handleRenderFinalVideo = async () => {
    if (!selectedProduct) return;
    setIsRendering(true);
    setRenderProgress("Iniciando renderização de vídeo vertical 9:16...");
    try {
      const priceNum = Number(selectedProduct.price) || 0;
      const res = await fetch("/api/admin/dark-video/render-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: selectedProduct.productName,
          price: priceNum,
          imageUrl: selectedProduct.imageUrl,
          sellerVideoUrl: sellerVideoUrl,
          scriptText: scriptText,
          captionText: captionText,
          affiliateLink: selectedProduct.offerLink || selectedProduct.productLink,
          sales: selectedProduct.sales,
          discountRate: selectedProduct.priceDiscountRate || selectedProduct.discountRate,
        }),
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setFinalVideoUrl(data.videoUrl);
        await fetchSavedVideos();
      } else {
        throw new Error(data.error || "Falha ao renderizar vídeo.");
      }
    } catch (e: any) {
      alert("Erro na renderização: " + e.message);
    } finally {
      setIsRendering(false);
    }
  };

  const handleCopyCaption = () => {
    if (!captionText) return;
    navigator.clipboard.writeText(captionText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleResetWorkflow = () => {
    setSelectedProduct(null);
    setSellerVideoUrl(null);
    setScriptText("");
    setCaptionText("");
    setFinalVideoUrl(null);
    setCurrentStep(1);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* ── CABEÇALHO DO ESTÚDIO ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #090a0f 0%, #161824 100%)",
          borderRadius: "24px",
          padding: "2rem",
          marginBottom: "2rem",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255, 87, 34, 0.15)", border: "1px solid rgba(255, 87, 34, 0.4)", color: "#FF7A00", padding: "4px 12px", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 800, marginBottom: "8px" }}>
              <Sparkles size={14} /> ESTÚDIO VIRAL SHOPEE ➔ SHORTS, TIKTOK & KWAI
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
              Criador de Vídeos de Alta Conversão
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.92rem", margin: 0, maxWidth: "620px" }}>
              Crie vídeos com os maiores sucessos de vendas da Shopee em 4 etapas guiadas com IA do Gemini e narração neural.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
                padding: "10px 16px", borderRadius: "12px", color: "#fff",
                fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
              }}
            >
              <Film size={16} /> Meus Vídeos Gerados ({savedVideos.length})
            </button>
            {selectedProduct && (
              <button
                onClick={handleResetWorkflow}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                  padding: "10px 16px", borderRadius: "12px", color: "#f87171",
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                Recomeçar
              </button>
            )}
          </div>
        </div>

        {/* ── BARRA DE PROGRESSO EM 4 PASSOS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "1rem" }}>
          {[
            { step: 1, title: "1. Mais Vendidos", desc: "Buscas em alta na Shopee" },
            { step: 2, title: "2. Vídeo do Produto", desc: "Vídeo original do vendedor" },
            { step: 3, title: "3. Narrativa Gemini", desc: "Roteiro persuasivo e legenda" },
            { step: 4, title: "4. Gerar Vídeo", desc: "YouTube Shorts, TikTok & Kwai" },
          ].map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <div
                key={s.step}
                onClick={() => {
                  if (s.step === 1 || (s.step === 2 && selectedProduct) || (s.step === 3 && selectedProduct) || (s.step === 4 && selectedProduct && scriptText)) {
                    setCurrentStep(s.step as any);
                  }
                }}
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(255,87,34,0.25), rgba(255,122,0,0.15))"
                    : isCompleted
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(255,255,255,0.03)",
                  border: isActive
                    ? "2px solid #FF5722"
                    : isCompleted
                    ? "1px solid #10b981"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: isActive ? "#FF7A00" : isCompleted ? "#10b981" : "#94a3b8" }}>
                    {s.title}
                  </span>
                  {isCompleted && <CheckCircle size={14} color="#10b981" />}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PASSO 1: PROCURAR MAIS VENDIDOS & BUSCAS EM ALTA ── */}
      {currentStep === 1 && (
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "1.75rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: "0 0 4px 0", color: "#0f172a" }}>
                Passo 1: Escolha um Produto Campeão de Vendas
              </h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
                Estes são os produtos com maior volume de buscas e vendas confirmadas na Shopee. Selecione um para criar o vídeo.
              </p>
            </div>

            {/* Barra de Busca de Tendências */}
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Pesquisar termo em alta (ex: copo termico)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1",
                  fontSize: "0.85rem", width: "260px", outline: "none"
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#FF5722", border: "none", color: "#fff", padding: "10px 16px",
                  borderRadius: "10px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px"
                }}
              >
                <Search size={14} /> Buscar
              </button>
            </form>
          </div>

          {/* Abas de Tendências Oficiais */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "1.5rem" }}>
            {TRENDING_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab)}
                style={{
                  padding: "8px 16px", borderRadius: "100px", border: "none",
                  background: activeTab === tab.id ? "#FF5722" : "#f1f5f9",
                  color: activeTab === tab.id ? "#fff" : "#475569",
                  fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid de Produtos */}
          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px auto", color: "#FF5722" }} />
              Buscando produtos mais vendidos na Shopee...
            </div>
          ) : trendingProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: "14px" }}>
              Nenhum produto encontrado. Tente outro termo de busca.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
              {trendingProducts.map((p) => {
                const discount = p.priceDiscountRate || p.discountRate;
                const priceNum = Number(p.price) || 0;
                return (
                  <div
                    key={p.itemId}
                    style={{
                      background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
                      overflow: "hidden", display: "flex", flexDirection: "column",
                      justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "#f1f5f9" }}>
                        <img src={p.imageUrl} alt={p.productName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {discount ? (
                          <div style={{ position: "absolute", top: "8px", right: "8px", background: "#ef4444", color: "#fff", fontSize: "0.72rem", fontWeight: 900, padding: "2px 8px", borderRadius: "6px" }}>
                            -{discount}%
                          </div>
                        ) : null}
                        {p.sales ? (
                          <div style={{ position: "absolute", bottom: "8px", left: "8px", background: "rgba(0,0,0,0.75)", color: "#facc15", fontSize: "0.72rem", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Flame size={12} /> {p.sales >= 1000 ? `${(p.sales / 1000).toFixed(1)}k` : p.sales} vendidos
                          </div>
                        ) : null}
                      </div>

                      <div style={{ padding: "12px" }}>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {p.productName}
                        </h4>
                        <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#FF5722" }}>
                          R$ {priceNum.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "12px", borderTop: "1px solid #f1f5f9" }}>
                      <button
                        onClick={() => handleSelectProduct(p)}
                        style={{
                          width: "100%", padding: "10px", borderRadius: "10px", border: "none",
                          background: "linear-gradient(135deg, #FF5722 0%, #FF7A00 100%)",
                          color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                          boxShadow: "0 4px 12px rgba(255,87,34,0.3)"
                        }}
                      >
                        👉 Criar Vídeo Deste Produto
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PASSO 2: VÍDEO DO PRODUTO (VENDEDOR SHOPEE) ── */}
      {currentStep === 2 && selectedProduct && (
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "2rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          {/* Barra do Produto Selecionado */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "12px 18px", borderRadius: "14px", marginBottom: "1.75rem", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img src={selectedProduct.imageUrl} alt="" style={{ width: "50px", height: "50px", borderRadius: "10px", objectFit: "cover" }} />
              <div>
                <span style={{ fontSize: "0.72rem", color: "#FF5722", fontWeight: 800 }}>PRODUTO SELECIONADO</span>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", maxWidth: "500px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedProduct.productName}
                </h4>
              </div>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "6px 14px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 700, color: "#475569", cursor: "pointer" }}
            >
              Trocar Produto
            </button>
          </div>

          <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: "0 0 6px 0", color: "#0f172a" }}>
            Passo 2: Vídeos da Galeria e Comentários do Produto (Shopee)
          </h2>
          <p style={{ margin: "0 0 1.5rem 0", color: "#64748b", fontSize: "0.88rem" }}>
            Vídeos reais da galeria do vendedor ou das avaliações dos clientes aumentam em até 5x a retenção nos Shorts, TikTok e Kwai.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem", alignItems: "start" }}>
            {/* Visualizador de Vídeo */}
            <div style={{ background: "#090a0f", borderRadius: "18px", padding: "1.2rem", textAlign: "center", color: "#fff" }}>
              {extractingVideo ? (
                <div style={{ padding: "4rem 1rem" }}>
                  <RefreshCw size={36} className="animate-spin" style={{ margin: "0 auto 14px auto", color: "#FF5722" }} />
                  <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "4px" }}>Buscando Vídeos na Shopee...</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Varrendo galeria oficial e vídeos de avaliações dos clientes</div>
                </div>
              ) : sellerVideoUrl ? (
                <div>
                  <div style={{ width: "100%", maxHeight: "380px", borderRadius: "12px", overflow: "hidden", background: "#000", marginBottom: "12px" }}>
                    <video key={sellerVideoUrl} src={sellerVideoUrl} controls autoPlay loop playsInline style={{ width: "100%", maxHeight: "380px", objectFit: "contain" }} />
                  </div>
                  <div style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", padding: "5px 12px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 800, marginBottom: "12px" }}>
                    ✅ VÍDEO SELECIONADO PARA O VÍDEO DARK (9:16)
                  </div>
                </div>
              ) : (
                <div style={{ padding: "3rem 1rem" }}>
                  <img src={selectedProduct.imageUrl} alt="" style={{ width: "120px", height: "120px", borderRadius: "12px", margin: "0 auto 12px auto", objectFit: "cover" }} />
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "4px" }}>Nenhum vídeo selecionado ainda</div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", maxWidth: "280px", margin: "0 auto" }}>
                    Você pode colar o link do vídeo de um comentário, enviar um arquivo do seu computador ou usar o Extrator 1-Clique ao lado!
                  </div>
                </div>
              )}

              {/* Lista de vídeos encontrados (Galeria vs Comentários) */}
              {availableVideos.length > 0 && (
                <div style={{ marginTop: "1rem", textAlign: "left", borderTop: "1px solid #1e293b", paddingTop: "1rem" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f8fafc", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Vídeos Disponíveis ({availableVideos.length}):</span>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>Clique para alternar</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                    {availableVideos.map((vid, idx) => {
                      const isSelected = sellerVideoUrl === vid.url;
                      const isReview = vid.type === "review" || vid.type === "comentario";
                      return (
                        <div
                          key={idx}
                          onClick={() => setSellerVideoUrl(vid.url)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "10px",
                            background: isSelected ? "#FF5722" : "#1e293b",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "0.78rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            border: isSelected ? "1px solid #FF7A00" : "1px solid #334155",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                            <span>{isReview ? "💬" : "🌟"}</span>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: isSelected ? 800 : 500 }}>
                              {vid.title}
                            </span>
                          </div>
                          {isSelected && <span style={{ fontSize: "0.7rem", fontWeight: 800 }}>ATIVO</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Opções e Ferramentas de Extração de Vídeo */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {/* Opção 1: Extrator 1-Clique na Shopee (Bookmarklet) */}
              <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", borderRadius: "16px", padding: "1.25rem", border: "1px solid #bfdbfe" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "1.2rem" }}>⚡</span>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: "#1e3a8a" }}>
                    Extrator 1-Clique Shopee (Galeria + Comentários)
                  </h4>
                </div>
                <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "#334155", lineHeight: 1.4 }}>
                  Arraste o botão abaixo para a <strong>barra de favoritos</strong> do seu navegador. Quando estiver na Shopee vendo a galeria ou os comentários do produto, clique nele para puxar todos os vídeos na hora!
                </p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <a
                    href={getShopeeBookmarkletCode()}
                    onClick={(e) => {
                      // Se for apenas clicado na própria página
                      e.preventDefault();
                      alert("👉 Arraste este botão para a sua Barra de Favoritos do Chrome/Edge (Ctrl+Shift+B para exibir a barra)!");
                    }}
                    draggable
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      background: "linear-gradient(135deg, #FF5722 0%, #FF7A00 100%)",
                      color: "#fff",
                      borderRadius: "10px",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      textDecoration: "none",
                      boxShadow: "0 3px 10px rgba(255,87,34,0.3)",
                      cursor: "grab",
                    }}
                    title="Arraste para sua barra de favoritos"
                  >
                    🎬 Puxar Vídeos Shopee
                  </a>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getShopeeBookmarkletCode());
                      setCopiedBookmarklet(true);
                      setTimeout(() => setCopiedBookmarklet(false), 2500);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "10px",
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {copiedBookmarklet ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
                    {copiedBookmarklet ? "Código Copiado!" : "Copiar Código Favorito"}
                  </button>
                </div>
              </div>

              {/* Opção 2: Colar Link Direto do Vídeo ou do Produto */}
              <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "0.92rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                  🔗 Colar Link Direto do Vídeo ou da Shopee
                </h4>
                <p style={{ margin: "0 0 10px 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                  <strong>Dica de ouro:</strong> No site da Shopee, clique com o <em>botão direito</em> em cima de qualquer vídeo (da galeria ou de uma avaliação de comprador) e selecione <strong>&quot;Copiar endereço do vídeo&quot;</strong>, depois cole aqui:
                </p>
                <form onSubmit={handleExtractManualUrl} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={customVideoUrlInput}
                    onChange={(e) => setCustomVideoUrlInput(e.target.value)}
                    placeholder="Cole o link do vídeo (.mp4 / vod.susercontent.com) ou link do produto..."
                    style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                  />
                  <button
                    type="submit"
                    disabled={extractingVideo}
                    style={{ background: "#0f172a", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "10px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {extractingVideo ? "Extraindo..." : "Usar Vídeo"}
                  </button>
                </form>
              </div>

              {/* Opção 3: Upload direto de arquivo de vídeo */}
              <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "1.25rem", border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 6px 0", fontSize: "0.92rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  📁 Ou Enviar Vídeo Salvo no Computador (MP4 / WebM / MOV)
                </h4>
                <p style={{ margin: "0 0 10px 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Se você baixou um vídeo de review ou gravou no celular, suba diretamente:
                </p>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  padding: "9px 16px", borderRadius: "10px", background: "#334155",
                  color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: uploadingVideo ? "not-allowed" : "pointer"
                }}>
                  <Video size={15} />
                  {uploadingVideo ? "Enviando arquivo..." : "Escolher Arquivo de Vídeo"}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    onChange={handleFileUpload}
                    disabled={uploadingVideo}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {/* Botões de Navegação */}
              <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
                <button
                  onClick={() => setCurrentStep(1)}
                  style={{ padding: "12px 18px", borderRadius: "12px", border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleGoToStep3}
                  style={{
                    flex: 1, padding: "12px 20px", borderRadius: "12px", border: "none",
                    background: "linear-gradient(135deg, #FF5722 0%, #FF7A00 100%)",
                    color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    boxShadow: "0 4px 14px rgba(255,87,34,0.35)"
                  }}
                >
                  Avançar para Passo 3: Narrativa IA <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PASSO 3: NARRATIVA DETALHADA COM GEMINI AI ── */}
      {currentStep === 3 && selectedProduct && (
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "2rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: "0 0 4px 0", color: "#0f172a" }}>
                Passo 3: Narrativa Persuasiva com Google Gemini AI
              </h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
                O Gemini cria um gancho magnético nos primeiros 3s, destaca benefícios e adiciona uma chamada irresistível para bio e comentários.
              </p>
            </div>

            <button
              onClick={handleGenerateGeminiNarrative}
              disabled={generatingScript}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none", color: "#fff", padding: "10px 18px", borderRadius: "10px",
                fontWeight: 800, fontSize: "0.85rem", cursor: generatingScript ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(59,130,246,0.3)"
              }}
            >
              <Sparkles size={16} className={generatingScript ? "animate-spin" : ""} />
              {generatingScript ? "Gemini Criando..." : "✨ Gerar Nova Versão"}
            </button>
          </div>

          {generatingScript ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
              <Sparkles size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: "#8b5cf6" }} />
              A inteligência artificial está escrevendo a narrativa de alta retenção...
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
              {/* Roteiro da Voz */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b" }}>
                    🎙️ Roteiro da Voz Narrada (Google Gemini TTS Oficial):
                  </label>
                  {narrationAudioUrl && (
                    <span style={{ fontSize: "0.75rem", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>
                      ✅ Áudio Gerado
                    </span>
                  )}
                </div>
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  rows={8}
                  style={{
                    width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #cbd5e1",
                    fontSize: "0.9rem", lineHeight: 1.6, color: "#0f172a", boxSizing: "border-box",
                    fontFamily: "inherit", resize: "vertical"
                  }}
                />
                
                {/* Player de Prévia da Narração Gemini */}
                {narrationAudioUrl && (
                  <div style={{ marginTop: "10px", background: "#f1f5f9", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🎧 Ouvir Narração Sintetizada pela API do Gemini:</span>
                    </div>
                    <audio src={narrationAudioUrl} controls style={{ width: "100%", height: "36px" }} />
                  </div>
                )}

                <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginTop: "6px" }}>
                  💡 Você pode editar qualquer palavra diretamente para ajustar o tom da narração.
                </span>
              </div>

              {/* Legenda Pronta */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b" }}>
                    📱 Legenda Pronta (TikTok, Kwai, Shorts & Reels):
                  </label>
                  <button
                    onClick={handleCopyCaption}
                    style={{
                      background: copiedCaption ? "#dcfce7" : "#f1f5f9",
                      border: "none", color: copiedCaption ? "#16a34a" : "#475569",
                      padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem",
                      fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px"
                    }}
                  >
                    {copiedCaption ? <Check size={12} /> : <Copy size={12} />}
                    {copiedCaption ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <textarea
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  rows={8}
                  style={{
                    width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #cbd5e1",
                    fontSize: "0.82rem", lineHeight: 1.5, color: "#334155", boxSizing: "border-box",
                    fontFamily: "inherit", resize: "vertical", background: "#f8fafc"
                  }}
                />
              </div>
            </div>
          )}

          {/* Botões de Navegação */}
          <div style={{ display: "flex", gap: "10px", marginTop: "2rem" }}>
            <button
              onClick={() => setCurrentStep(2)}
              style={{ padding: "12px 18px", borderRadius: "12px", border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}
            >
              Voltar
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              disabled={!scriptText.trim()}
              style={{
                flex: 1, padding: "12px 20px", borderRadius: "12px", border: "none",
                background: "linear-gradient(135deg, #FF5722 0%, #FF7A00 100%)",
                color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: !scriptText.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                boxShadow: "0 4px 14px rgba(255,87,34,0.35)"
              }}
            >
              Avançar para Passo 4: Renderizar Vídeo Final <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 4: GERADOR DE VÍDEO (YOUTUBE SHORTS, TIKTOK E KWAI) ── */}
      {currentStep === 4 && selectedProduct && (
        <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "2rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: "0 0 6px 0", color: "#0f172a" }}>
            Passo 4: Gerador de Vídeo para YouTube Shorts, TikTok e Kwai
          </h2>
          <p style={{ margin: "0 0 1.5rem 0", color: "#64748b", fontSize: "0.88rem" }}>
            Renderize o vídeo final em resolução vertical 9:16 (1080x1920) pronto para postar nas 3 redes sociais.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem", alignItems: "start" }}>
            {/* Player do Vídeo Final */}
            <div style={{ background: "#090a0f", borderRadius: "20px", padding: "1.25rem", textAlign: "center", color: "#fff" }}>
              {isRendering ? (
                <div style={{ padding: "5rem 1rem" }}>
                  <RefreshCw size={40} className="animate-spin" style={{ margin: "0 auto 16px auto", color: "#FF5722" }} />
                  <div style={{ fontWeight: 900, fontSize: "1.1rem", marginBottom: "6px" }}>Renderizando Vídeo 9:16...</div>
                  <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Sintetizando voz neural e unificando elementos</div>
                </div>
              ) : finalVideoUrl ? (
                <div>
                  <div style={{ width: "240px", height: "426px", borderRadius: "14px", overflow: "hidden", background: "#000", margin: "0 auto 14px auto", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                    <video src={finalVideoUrl} controls autoPlay loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", padding: "4px 12px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 800 }}>
                    🎉 VÍDEO PRONTO PARA POSTAR!
                  </div>
                </div>
              ) : (
                <div style={{ padding: "4rem 1rem" }}>
                  <Smartphone size={56} style={{ color: "#64748b", margin: "0 auto 16px auto" }} />
                  <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "4px" }}>Clique no botão abaixo para renderizar</div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Formato 9:16 (1080x1920) em 30 FPS</div>
                </div>
              )}
            </div>

            {/* Ações e Downloads */}
            <div>
              <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "1.25rem", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 800, color: "#1e293b" }}>
                  📋 Resumo da Produção
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", color: "#475569" }}>
                  <div><strong>Produto:</strong> {selectedProduct.productName}</div>
                  <div><strong>Preço no Vídeo:</strong> R$ {Number(selectedProduct.price || 0).toFixed(2).replace(".", ",")}</div>
                  <div><strong>Vídeo Demonstrativo:</strong> {sellerVideoUrl ? "✅ Vídeo Original do Vendedor Shopee" : "Foto Oficial HD"}</div>
                  <div><strong>Narração:</strong> {narrationAudioUrl ? "✅ Google Gemini Audio API (Pronta)" : "Google Gemini TTS Neural (pt-BR)"}</div>
                </div>
              </div>

              {!finalVideoUrl ? (
                <button
                  onClick={handleRenderFinalVideo}
                  disabled={isRendering}
                  style={{
                    width: "100%", padding: "16px", borderRadius: "14px", border: "none",
                    background: isRendering ? "#64748b" : "linear-gradient(135deg, #FF5722 0%, #FF7A00 100%)",
                    color: "#fff", fontWeight: 900, fontSize: "1.05rem", cursor: isRendering ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    boxShadow: "0 6px 20px rgba(255,87,34,0.4)"
                  }}
                >
                  <Film size={20} className={isRendering ? "animate-spin" : ""} />
                  {isRendering ? "Renderizando Vídeo com FFmpeg..." : "🚀 Renderizar Vídeo 9:16 Agora"}
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <a
                    href={finalVideoUrl}
                    download="video-shopee-shorts.mp4"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      padding: "14px", borderRadius: "12px", background: "#ef4444", color: "#fff",
                      fontWeight: 800, fontSize: "0.92rem", textDecoration: "none", boxShadow: "0 4px 14px rgba(239,68,68,0.3)"
                    }}
                  >
                    <Download size={18} /> Baixar para YouTube Shorts (MP4)
                  </a>

                  <a
                    href={finalVideoUrl}
                    download="video-shopee-tiktok.mp4"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      padding: "14px", borderRadius: "12px", background: "#0f172a", color: "#fff",
                      fontWeight: 800, fontSize: "0.92rem", textDecoration: "none"
                    }}
                  >
                    <Download size={18} /> Baixar para TikTok (MP4)
                  </a>

                  <a
                    href={finalVideoUrl}
                    download="video-shopee-kwai.mp4"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      padding: "14px", borderRadius: "12px", background: "#f97316", color: "#fff",
                      fontWeight: 800, fontSize: "0.92rem", textDecoration: "none"
                    }}
                  >
                    <Download size={18} /> Baixar para Kwai (MP4)
                  </a>

                  <button
                    onClick={handleCopyCaption}
                    style={{
                      padding: "12px", borderRadius: "12px", border: "1px solid #cbd5e1",
                      background: "#fff", color: "#334155", fontWeight: 800, fontSize: "0.85rem",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                    }}
                  >
                    {copiedCaption ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                    {copiedCaption ? "Legenda Copiada!" : "Copiar Legenda Pronta"}
                  </button>

                  <button
                    onClick={handleResetWorkflow}
                    style={{
                      marginTop: "10px", padding: "12px", borderRadius: "12px", border: "none",
                      background: "#f1f5f9", color: "#475569", fontWeight: 800, fontSize: "0.85rem",
                      cursor: "pointer"
                    }}
                  >
                    🎉 Criar Outro Vídeo para Novo Produto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SEÇÃO HISTÓRICO DE VÍDEOS GERADOS ── */}
      {showHistory && (
        <div style={{ marginTop: "2.5rem", background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: 0, color: "#0f172a" }}>
              📁 Meus Vídeos Gerados ({savedVideos.length})
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              style={{ background: "none", border: "none", color: "#64748b", fontWeight: 700, cursor: "pointer" }}
            >
              Fechar
            </button>
          </div>

          {savedVideos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              Nenhum vídeo salvo ainda. Conclua as 4 etapas acima para renderizar o seu primeiro vídeo!
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {savedVideos.map((item) => (
                <div key={item.id} style={{ background: "#f8fafc", borderRadius: "14px", padding: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "48px", height: "48px", borderRadius: "8px", background: "#cbd5e1" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h5 style={{ margin: "0 0 2px 0", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.productName}
                      </h5>
                      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#FF5722" }}>
                        {item.price ? `R$ ${item.price.toFixed(2).replace(".", ",")}` : ""}
                      </span>
                    </div>
                  </div>

                  {item.videoUrl && (
                    <a
                      href={item.videoUrl}
                      download={`shorts-${item.id}.mp4`}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        padding: "8px", borderRadius: "8px", background: "#0f172a", color: "#fff",
                        fontWeight: 700, fontSize: "0.8rem", textDecoration: "none"
                      }}
                    >
                      <Download size={14} /> Baixar Vídeo MP4
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
