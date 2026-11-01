"use client";

import { useState } from "react";
import { Video, RefreshCw, Copy, CheckCheck, FileText, Tag, Image, Play, Download, Film, Sparkles, Smartphone, X, Trash2 } from "lucide-react";
import { DarkVideoPipeline } from "./DarkVideoPipeline";

interface Post { id: string; title: string; slug: string; }
interface Category { id: string; name: string; slug: string; }
interface ScriptResult {
  title: string;
  productCount: number;
  fullScript: string;
  techZoneData?: {
    introNarration: string;
    outroNarration: string;
    championProductIndex: number;
    items: Array<{
      number: number;
      productName: string;
      shortName: string;
      hook: string;
      narration: string;
      priceSpoken: string;
      salesHighlight: string;
      isChampion: boolean;
      isBestValue: boolean;
    }>;
  };
  youtubeDescription: string;
  thumbnailSuggestion: string;
  tags: string[];
  products: {
    id?: string;
    slug?: string;
    categoryId?: string;
    categoryName?: string;
    name: string;
    price: number;
    imageUrl: string;
    link: string;
    ratingStar: number;
    sales?: number;
    discount?: number;
  }[];
}

interface Props {
  posts: Post[];
  categories: Category[];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "7px 14px", borderRadius: "10px",
        background: copied ? "#dcfce7" : "#f1f5f9",
        border: `1px solid ${copied ? "#86efac" : "#e2e8f0"}`,
        color: copied ? "#166534" : "#475569",
        fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
      }}
    >
      {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

export function YouTubeScriptGenerator({ posts, categories }: Props) {
  const [mainSection, setMainSection] = useState<"pipeline" | "youtube">("pipeline");
  const [source, setSource] = useState<"auto" | "flash" | "search" | "post" | "category" | "youtube">("auto");
  const [selectedGenre, setSelectedGenre] = useState("smart");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [siteUrl, setSiteUrl] = useState("https://achadinhosdodia.com.br");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"script" | "description" | "thumbnail" | "tags" | "video">("script");

  // Estado do gerador de vídeo FFmpeg e Piper TTS
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [videoResult, setVideoResult] = useState<{ videoUrl: string; filename: string } | null>(null);
  const [videoError, setVideoError] = useState("");

  // Estado do gerador de Shorts vertical 9:16
  const [generatingShortsIndex, setGeneratingShortsIndex] = useState<number | null>(null);
  const [shortsResults, setShortsResults] = useState<{ [index: number]: { videoUrl: string; filename: string } }>({});
  const [shortsModal, setShortsModal] = useState<{ videoUrl: string; filename: string; productName: string } | null>(null);

  // Estado de exclusão e substituição automática na mesma categoria
  const [replacingProductIndex, setReplacingProductIndex] = useState<number | null>(null);
  const [replaceNotice, setReplaceNotice] = useState<string | null>(null);

  const isCloud = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setResult(null);
    setVideoResult(null);

    const body: any = {
      siteUrl,
      source,
      genre: selectedGenre === "custom" ? "smart" : selectedGenre,
      searchQuery: (source === "search" || selectedGenre === "custom") ? searchQuery.trim() : undefined,
    };
    if (source === "flash") body.flashDeals = true;
    if (source === "search") {
      if (!searchQuery.trim()) {
        setError("Por favor, digite um termo ou nicho para buscar na Shopee.");
        setLoading(false);
        return;
      }
      body.searchQuery = searchQuery.trim();
    }
    if (source === "post" && selectedPostId) body.postId = selectedPostId;
    if (source === "category" && selectedCategoryId) body.categoryId = selectedCategoryId;
    if (source === "youtube") {
      if (!youtubeUrl.trim()) {
        setError("Por favor, cole a URL de um vídeo do YouTube.");
        setLoading(false);
        return;
      }
      body.youtubeUrl = youtubeUrl.trim();
    }

    try {
      const res = await fetch("/api/admin/youtube/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar roteiro");
      setResult(data);
      setActiveTab("script");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateVideo() {
    if (!result) return;
    if (isCloud) {
      setVideoError("A renderização de vídeos com FFmpeg e voz neural roda no seu computador local (http://localhost:3000/admin/youtube) para utilizar o processador da sua máquina com performance máxima e custo zero. Aqui na nuvem, você pode gerar roteiros, descrições e tags livremente!");
      return;
    }
    setGeneratingVideo(true);
    setVideoError("");

    try {
      // Monta textos de narração no formato esperado pelo renderizador caso venha do Gemini
      let scriptTexts: string[] | undefined = undefined;
      if (result.techZoneData && result.techZoneData.items?.length === result.products.length) {
        scriptTexts = [
          result.techZoneData.introNarration,
          ...result.techZoneData.items.map((it) => it.narration),
          result.techZoneData.outroNarration,
        ];
      }

      const res = await fetch("/api/admin/youtube/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: result.products,
          theme: result.title,
          siteUrl,
          withAudio: includeAudio,
          scriptTexts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao processar vídeo");

      setVideoResult(data);
      setActiveTab("video");
    } catch (e: any) {
      setVideoError(e.message);
    } finally {
      setGeneratingVideo(false);
    }
  }

  async function handleGenerateShorts(product: any, index: number) {
    if (isCloud) {
      setVideoError("A renderização de Shorts verticais com FFmpeg e voz neural roda no seu computador local (http://localhost:3000/admin/youtube) para utilizar o processador da sua máquina com performance máxima e custo zero. Aqui na nuvem, você pode gerar roteiros, descrições e tags livremente!");
      return;
    }
    setGeneratingShortsIndex(index);
    setVideoError("");

    try {
      const res = await fetch("/api/admin/youtube/generate-shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          siteUrl,
          withAudio: includeAudio,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao renderizar Shorts");

      setShortsResults((prev) => ({ ...prev, [index]: data }));
      setShortsModal({ videoUrl: data.videoUrl, filename: data.filename, productName: product.name });
    } catch (e: any) {
      setVideoError(e.message);
    } finally {
      setGeneratingShortsIndex(null);
    }
  }

  async function handleReplaceProduct(index: number) {
    if (!result || !result.products[index]) return;
    const prodToRemove = result.products[index];
    setReplacingProductIndex(index);
    setReplaceNotice(null);

    try {
      const res = await fetch("/api/admin/youtube/replace-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productToRemove: prodToRemove,
          currentProductIds: result.products.map((p: any) => p.id).filter(Boolean),
          currentProductSlugs: result.products.map((p: any) => p.slug).filter(Boolean),
          positionIndex: index,
          siteUrl,
          theme: result.title,
          allProducts: result.products,
          techZoneData: result.techZoneData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao substituir produto");

      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          products: data.updatedProducts,
          techZoneData: data.techZoneData,
          youtubeDescription: data.updatedDescription,
          fullScript: data.fullScript,
          tags: data.tags,
        };
      });

      // Limpa Shorts previamente gerado para essa posição substituída
      setShortsResults((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });

      // Se já havia um vídeo compilado, avisa que o roteiro foi atualizado
      if (videoResult) {
        setVideoResult(null);
      }

      setReplaceNotice(
        `Produto #${index + 1} excluído e substituído com sucesso por "${data.replacement.name.slice(0, 45)}..." da categoria ${data.categoryName}!`
      );
    } catch (err: any) {
      alert("Erro ao excluir e substituir produto: " + (err.message || "Tente novamente."));
    } finally {
      setReplacingProductIndex(null);
    }
  }

  const tabStyle = (active: boolean) => ({
    padding: "8px 18px", borderRadius: "10px", fontWeight: 700,
    fontSize: "0.88rem", cursor: "pointer", border: "none",
    background: active ? "#FF5722" : "#f1f5f9",
    color: active ? "#fff" : "#64748b",
  });

  return (
    <div style={{ padding: "3rem", color: "#000" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "1.5rem" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "linear-gradient(135deg,#FF5722,#FF7A00)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Video size={28} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "2.2rem", fontWeight: 800, margin: 0 }}>
            Gerador de Roteiro e Vídeo YouTube
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontWeight: 500 }}>
            Gera roteiro natural humano, descrição, tags e renderiza vídeo MP4 pronto para o canal dark.
          </p>
        </div>
      </div>

      {isCloud && (
        <div style={{
          background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)",
          border: "1px solid #fef08a",
          borderRadius: "16px",
          padding: "1rem 1.4rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          color: "#854d0e"
        }}>
          <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>☁️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "4px" }}>
              Modo Nuvem (Vercel) Ativo
            </div>
            <div style={{ fontSize: "0.85rem", color: "#713f12", lineHeight: 1.5 }}>
              A geração de roteiros humanos, descrições para YouTube, tags de ranqueamento e esteira de links Shopee funcionam 100% online. Para <strong>renderizar os arquivos de vídeo MP4</strong> com narração neural ultra-rápida (Piper TTS + FFmpeg a R$ 0), utilize o painel no seu computador local em <code>http://localhost:3000/admin/youtube</code>.
            </div>
          </div>
        </div>
      )}

      {/* Switcher de Seções: Esteira Dark vs Vídeo 16:9 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "2rem", background: "#f8fafc", padding: "6px", borderRadius: "18px", border: "1px solid #e2e8f0", width: "fit-content" }}>
        <button
          onClick={() => setMainSection("pipeline")}
          style={{
            padding: "10px 22px", borderRadius: "14px", border: "none",
            background: mainSection === "pipeline" ? "linear-gradient(135deg, #09090b 0%, #18181b 100%)" : "transparent",
            color: mainSection === "pipeline" ? "#fff" : "#64748b",
            fontWeight: 800, fontSize: "0.92rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "8px",
            boxShadow: mainSection === "pipeline" ? "0 4px 14px rgba(0,0,0,0.2)" : "none"
          }}
        >
          <Smartphone size={18} color={mainSection === "pipeline" ? "#FF5722" : "currentColor"} />
          📱 Esteira de Vídeos Dark (Shorts/Reels 9:16)
          <span style={{ fontSize: "0.68rem", background: "#FF5722", color: "#fff", padding: "2px 7px", borderRadius: "6px", fontWeight: 900 }}>NOVO</span>
        </button>

        <button
          onClick={() => setMainSection("youtube")}
          style={{
            padding: "10px 22px", borderRadius: "14px", border: "none",
            background: mainSection === "youtube" ? "#FF5722" : "transparent",
            color: mainSection === "youtube" ? "#fff" : "#64748b",
            fontWeight: 800, fontSize: "0.92rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "8px",
            boxShadow: mainSection === "youtube" ? "0 4px 14px rgba(255,87,34,0.3)" : "none"
          }}
        >
          <Film size={18} />
          🎬 Gerador de Roteiro e Vídeo 16:9 (YouTube)
        </button>
      </div>

      {mainSection === "pipeline" ? (
        <DarkVideoPipeline />
      ) : (
        <>
      {/* Config Panel */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "2rem", marginBottom: "2rem", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.5rem", color: "#0f172a" }}>⚙️ Configurações</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
          {/* Source */}
          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: "6px" }}>
              Fonte dos produtos
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
              style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            >
              <option value="auto">🔥 Automático — Top vendas (Live Shopee)</option>
              <option value="flash">⚡ Ofertas Relâmpago do Dia (Maiores Descontos)</option>
              <option value="search">🔍 Buscar Nicho Direto na Shopee (Live API)</option>
              <option value="youtube">🎥 A partir de um Vídeo do YouTube (Identificar Produtos)</option>
              <option value="post">📝 A partir de um artigo do blog</option>
              <option value="category">📂 A partir de uma categoria</option>
            </select>
          </div>

          {/* Seletor de Gênero / Nicho para garantir produtos do mesmo gênero */}
          {(source === "auto" || source === "flash" || source === "search") && (
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: "6px" }}>
                🎯 Gênero / Nicho do Vídeo (Produtos do mesmo tema)
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              >
                <option value="smart">✨ Inteligente (IA escolhe um gênero vencedor do dia)</option>
                <option value="cozinha">🍳 Casa, Cozinha & Utensílios Práticos</option>
                <option value="tecnologia">📱 Tecnologia & Gadgets Inteligentes</option>
                <option value="organizacao">🧹 Organização & Casa</option>
                <option value="beleza">💄 Beleza, Skincare & Cuidados</option>
                <option value="moda">👟 Moda & Calçados em Alta</option>
                <option value="infantil">🧸 Infantil & Brinquedos Criativos</option>
                <option value="ferramentas">🛠️ Ferramentas & Automotivo</option>
                <option value="fitness">💪 Fitness & Vida Saudável</option>
                <option value="custom">✍️ Digitar Nicho ou Termo Específico...</option>
              </select>
            </div>
          )}

          {/* Campo de Busca Direta por Nicho / Palavra-chave */}
          {(source === "search" || selectedGenre === "custom") && (
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: "6px" }}>
                🔎 Termo de Busca na Shopee (Live Search API)
              </label>
              <input
                type="text"
                placeholder="Ex: air fryer, gadgets inteligentes, fone bluetooth, organizadores, maquiagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              />
              <span style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                ⚡ Busca direto na Open API da Shopee produtos reais mais vendidos desse nicho e converte automaticamente em links de afiliados.
              </span>
            </div>
          )}

          {/* YouTube Video URL input */}
          {source === "youtube" && (
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: "6px" }}>
                Link do Vídeo do YouTube
              </label>
              <input
                type="text"
                placeholder="Ex: https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              />
              <span style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                💡 O sistema vai carregar o vídeo, identificar os produtos e links da Shopee, baixar as fotos em alta definição e montar o roteiro dinâmico do canal Achadinhos do Dia!
              </span>
            </div>
          )}

          {/* Post selector */}
          {source === "post" && (
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: "6px" }}>
                Selecione o artigo
              </label>
              <select
                value={selectedPostId}
                onChange={(e) => setSelectedPostId(e.target.value)}
                style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              >
                <option value="">— Escolha um artigo —</option>
                {posts.map((p) => (
                  <option key={p.id} value={p.id}>{p.title.slice(0, 55)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category selector */}
          {source === "category" && (
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: "6px" }}>
                Selecione a categoria
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              >
                <option value="">— Escolha uma categoria —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Site URL */}
          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "#475569", marginBottom: "6px" }}>
              URL do seu site
            </label>
            <input
              type="text"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>
        </div>

        {(source === "auto" || source === "flash" || source === "search") && (
          <div style={{ marginTop: "1.25rem", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 16px", borderRadius: "12px", fontSize: "0.85rem", color: "#166534", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>⚡ <strong>Mecanismo Live Search Shopee Integrado:</strong> tanto o <em>Top Vendas</em> quanto as <em>Ofertas Relâmpago</em> consultam em tempo real a API da Shopee e trazem 10 produtos 100% focados no mesmo gênero selecionado, com links de afiliados oficiais pré-gerados.</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "1.5rem", flexWrap: "wrap" }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "0.8rem 2rem", borderRadius: "14px",
              background: loading ? "#94a3b8" : "linear-gradient(135deg,#FF5722,#FF7A00)",
              color: "#fff", fontWeight: 800, fontSize: "1rem",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 16px rgba(255,87,34,0.3)",
            }}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            {loading
              ? source === "youtube"
                ? "Analisando produtos e gerando roteiro do Achadinhos do Dia..."
                : "Gerando roteiro com IA..."
              : source === "youtube"
              ? "🔍 Identificar Produtos do Vídeo e Gerar Roteiro"
              : "🎬 1. Gerar Roteiro e Dados"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: "1rem", padding: "0.8rem 1.2rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b", fontSize: "0.9rem" }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Produtos no vídeo", value: result.productCount, emoji: "🛍️" },
              { label: "Seções do roteiro", value: result.productCount + 2, emoji: "📋" },
              { label: "Tags geradas", value: result.tags.length, emoji: "🏷️" },
              { label: "Links na descrição", value: result.productCount, emoji: "🔗" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem" }}>{s.emoji}</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "#FF5722" }}>{s.value}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quick Video Generator Banner */}
          <div style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            borderRadius: "20px",
            padding: "1.75rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.5rem",
            color: "#fff",
            boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.2)"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a5b4fc", fontWeight: 700, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Sparkles size={16} /> Fábrica de Vídeos Automática (FFmpeg)
              </div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, margin: "6px 0 4px 0" }}>
                Renderizar Vídeo MP4 com Narração (1080p Full HD)
              </h3>
              <p style={{ margin: "0 0 10px 0", color: "#cbd5e1", fontSize: "0.9rem" }}>
                Gera o vídeo completo do canal Achadinhos do Dia com roteiro humanizado, análise individual dos produtos e narração sincronizada.
              </p>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem", color: "#f8fafc", background: "rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: "10px" }}>
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  style={{ width: "17px", height: "17px", accentColor: "#FF5722", cursor: "pointer" }}
                />
                🎙️ <strong>Narração com Google Gemini Audio API</strong> — Voz neural oficial sincronizada
              </label>
            </div>

            <button
              onClick={handleGenerateVideo}
              disabled={generatingVideo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "0.9rem 1.8rem",
                borderRadius: "14px",
                background: generatingVideo ? "#64748b" : "linear-gradient(135deg, #FF5722 0%, #FF8A00 100%)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "1rem",
                border: "none",
                cursor: generatingVideo ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(255,87,34,0.4)",
              }}
            >
              {generatingVideo ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Renderizando Vídeo (aguarde ~25s)...
                </>
              ) : (
                <>
                  <Film size={18} />
                  🎬 2. Renderizar Vídeo MP4
                </>
              )}
            </button>
          </div>

          {videoError && (
            <div style={{ padding: "1rem 1.25rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#991b1b", fontSize: "0.9rem" }}>
              ⚠️ Erro ao renderizar vídeo: {videoError}
            </div>
          )}

          {/* Title display */}
          <div style={{ background: "linear-gradient(135deg,#FF5722,#FF7A00)", borderRadius: "18px", padding: "1.5rem 2rem" }}>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
              Título Gerado para o Vídeo
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", lineHeight: 1.3 }}>{result.title}</div>
            <div style={{ marginTop: "10px" }}>
              <CopyButton text={result.title} label="Copiar título" />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "20px", overflow: "hidden" }}>
            <div style={{ display: "flex", gap: "8px", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
              <button style={tabStyle(activeTab === "video")} onClick={() => setActiveTab("video")}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Film size={15} /> Vídeo MP4 {videoResult ? "✅" : ""}</span>
              </button>
              <button style={tabStyle(activeTab === "script")} onClick={() => setActiveTab("script")}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><FileText size={15} /> Roteiro Completo</span>
              </button>
              <button style={tabStyle(activeTab === "description")} onClick={() => setActiveTab("description")}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Play size={15} /> Descrição YouTube</span>
              </button>
              <button style={tabStyle(activeTab === "thumbnail")} onClick={() => setActiveTab("thumbnail")}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Image size={15} /> Thumbnail</span>
              </button>
              <button style={tabStyle(activeTab === "tags")} onClick={() => setActiveTab("tags")}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Tag size={15} /> Tags</span>
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              {activeTab === "video" && (
                <div>
                  {videoResult ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", display: "block" }}>
                            🎉 Seu vídeo com narração está pronto em Full HD!
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                            Resolução 1920x1080 • Áudio AAC (Google Gemini Audio API) • Sem marcas d&apos;água • Transições suaves
                          </span>
                        </div>

                        <a
                          href={videoResult.videoUrl}
                          download={videoResult.filename}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "0.75rem 1.5rem",
                            borderRadius: "12px",
                            background: "#16a34a",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            textDecoration: "none",
                            boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
                          }}
                        >
                          <Download size={16} /> Baixar Vídeo com Narração ({videoResult.filename})
                        </a>
                      </div>

                      {/* Video Player */}
                      <div style={{ borderRadius: "16px", overflow: "hidden", background: "#000", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", marginBottom: "1.5rem" }}>
                        <video
                          controls
                          src={videoResult.videoUrl}
                          style={{ width: "100%", maxHeight: "550px", display: "block" }}
                        />
                      </div>

                      {/* Workflow instructions */}
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.25rem" }}>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: 800, color: "#1e293b" }}>
                          💡 O vídeo já está com a narração gravada!
                        </h4>
                        <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569", fontSize: "0.88rem", lineHeight: 1.7 }}>
                          <li>O vídeo já contém a <strong>voz neural gerada pelo Google Gemini</strong> sincronizada perfeitamente com os produtos e preços.</li>
                          <li>Se quiser, você pode adicionar uma música de fundo suave ou subir o arquivo direto no YouTube Studio.</li>
                          <li>Copie a <strong>Descrição YouTube</strong> e as <strong>Tags</strong> nas abas ao lado e publique seu vídeo!</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎬</div>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
                        Nenhum vídeo renderizado ainda
                      </h3>
                      <p style={{ color: "#64748b", maxWidth: "480px", margin: "0 auto 1.5rem auto", fontSize: "0.9rem" }}>
                        Clique no botão roxo acima <strong>"Renderizar Vídeo MP4"</strong> para compilar as imagens dos produtos, preços e transições no estilo do Creatify.
                      </p>
                      <button
                        onClick={handleGenerateVideo}
                        disabled={generatingVideo}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "0.8rem 1.6rem",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #FF5722 0%, #FF8A00 100%)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          border: "none",
                          cursor: generatingVideo ? "not-allowed" : "pointer",
                        }}
                      >
                        <Film size={16} /> Renderizar Vídeo Agora
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "script" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Roteiro pronto para narrar no ElevenLabs ou CapCut</span>
                    <CopyButton text={result.fullScript} label="Copiar roteiro completo" />
                  </div>
                  <pre style={{
                    background: "#0f172a", color: "#e2e8f0",
                    padding: "1.5rem", borderRadius: "14px",
                    fontSize: "0.82rem", lineHeight: 1.75,
                    overflowX: "auto", whiteSpace: "pre-wrap",
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                    maxHeight: "520px", overflowY: "auto",
                  }}>
                    {result.fullScript}
                  </pre>
                </div>
              )}

              {activeTab === "description" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Cole esta descrição direto no YouTube Studio</span>
                    <CopyButton text={result.youtubeDescription} label="Copiar descrição" />
                  </div>
                  <pre style={{
                    background: "#f8fafc", color: "#334155",
                    padding: "1.5rem", borderRadius: "14px",
                    fontSize: "0.85rem", lineHeight: 1.75,
                    overflowX: "auto", whiteSpace: "pre-wrap",
                    border: "1px solid #e2e8f0",
                    maxHeight: "520px", overflowY: "auto",
                  }}>
                    {result.youtubeDescription}
                  </pre>
                </div>
              )}

              {activeTab === "thumbnail" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Guia para criar a thumbnail no Canva</span>
                    <CopyButton text={result.thumbnailSuggestion} label="Copiar guia" />
                  </div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "1.5rem" }}>
                    <pre style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "#334155", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                      {result.thumbnailSuggestion}
                    </pre>
                    <div style={{ marginTop: "1.5rem" }}>
                      <p style={{ fontWeight: 700, marginBottom: "0.75rem", fontSize: "0.9rem" }}>📸 Prévia das imagens dos produtos:</p>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {result.products.slice(0, 3).map((p, i) => (
                          <div key={i} style={{ width: "100px", height: "100px", borderRadius: "10px", overflow: "hidden", border: "2px solid #e2e8f0" }}>
                            <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tags" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>Cole no campo de tags do YouTube Studio</span>
                    <CopyButton text={result.tags.join(", ")} label="Copiar todas as tags" />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {result.tags.map((tag) => (
                      <span key={tag} style={{
                        background: "#fff3e0", color: "#FF5722", border: "1px solid #FFB74D",
                        padding: "5px 14px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600,
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product preview & Shorts Generator */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  🛍️ Produtos Identificados ({result.products.length})
                </h3>
                <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                  Você pode <strong>excluir e substituir qualquer produto</strong> por outro da mesma categoria automaticamente, renderizar o vídeo longo completo acima ou criar <strong>Shorts (9:16)</strong> individuais!
                </p>
              </div>
            </div>

            {replaceNotice && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  color: "#166534",
                  padding: "0.85rem 1.15rem",
                  borderRadius: "12px",
                  marginBottom: "1.25rem",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  boxShadow: "0 2px 6px rgba(22, 101, 52, 0.08)",
                }}
              >
                <span>✨ {replaceNotice}</span>
                <button
                  onClick={() => setReplaceNotice(null)}
                  style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", padding: "2px" }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1.25rem" }}>
              {result.products.map((p, i) => {
                const isGenerating = generatingShortsIndex === i;
                const isReplacing = replacingProductIndex === i;
                const shorts = shortsResults[i];

                return (
                  <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden", fontSize: "0.82rem", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", position: "relative" }}>
                    <div>
                      <div style={{ position: "relative" }}>
                        <img src={p.imageUrl} alt={p.name} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
                        <span style={{ position: "absolute", top: "8px", left: "8px", background: "#FF5722", color: "#fff", padding: "3px 9px", borderRadius: "8px", fontWeight: 900, fontSize: "0.75rem", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
                          #{i + 1}
                        </span>

                        {/* Botão para Excluir e Substituir por outro da mesma categoria */}
                        <button
                          onClick={() => handleReplaceProduct(i)}
                          disabled={isReplacing || replacingProductIndex !== null}
                          title="Excluir este produto e localizar automaticamente outro da mesma categoria"
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            background: "rgba(225, 29, 72, 0.92)",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.4)",
                            borderRadius: "8px",
                            padding: "4px 8px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: isReplacing || replacingProductIndex !== null ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            backdropFilter: "blur(4px)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Excluir</span>
                        </button>

                        {/* Loading Overlay durante a substituição */}
                        {isReplacing && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(15, 23, 42, 0.9)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              color: "#fff",
                              padding: "1rem",
                              textAlign: "center",
                              zIndex: 10,
                            }}
                          >
                            <RefreshCw size={24} className="animate-spin" style={{ color: "#FF5722" }} />
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, lineHeight: 1.3 }}>
                              Buscando produto da mesma categoria...
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "0.85rem" }}>
                        {p.categoryName && (
                          <div style={{ fontSize: "0.68rem", color: "#6366f1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                            📁 {p.categoryName}
                          </div>
                        )}
                        <div style={{ fontWeight: 700, marginBottom: "6px", lineHeight: 1.35, color: "#0f172a" }}>{p.name.slice(0, 50)}</div>
                        <div style={{ color: "#FF5722", fontWeight: 900, fontSize: "1.05rem" }}>
                          R$ {p.price ? p.price.toFixed(2).replace(".", ",") : "—"}
                        </div>
                        <div style={{ color: "#f59e0b", fontSize: "0.8rem", marginTop: "2px" }}>★ {p.ratingStar?.toFixed(1) || "4.9"}</div>
                      </div>
                    </div>

                    <div>
                      {/* Botão Secundário de Troca Rápida */}
                      <div style={{ padding: "0 0.85rem 0.6rem 0.85rem" }}>
                        <button
                          onClick={() => handleReplaceProduct(i)}
                          disabled={isReplacing || replacingProductIndex !== null}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "8px",
                            border: "1px dashed #cbd5e1",
                            background: "#f8fafc",
                            color: "#475569",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: isReplacing || replacingProductIndex !== null ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                          }}
                        >
                          <RefreshCw size={11} className={isReplacing ? "animate-spin" : ""} />
                          Trocar por outro da categoria
                        </button>
                      </div>

                      <div style={{ padding: "0.6rem 0.85rem 0.85rem 0.85rem", borderTop: "1px solid #f1f5f9" }}>
                      {shorts ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => setShortsModal({ videoUrl: shorts.videoUrl, filename: shorts.filename, productName: p.name })}
                            style={{
                              flex: 1, padding: "8px 10px", borderRadius: "10px", border: "none",
                              background: "#10b981", color: "#fff", fontWeight: 800, fontSize: "0.78rem",
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px"
                            }}
                          >
                            <Play size={14} /> Assistir
                          </button>
                          <a
                            href={shorts.videoUrl}
                            download={shorts.filename}
                            style={{
                              padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1",
                              background: "#f8fafc", color: "#0f172a", fontWeight: 800, fontSize: "0.78rem",
                              textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                            title="Baixar Shorts MP4"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateShorts(p, i)}
                          disabled={isGenerating || generatingShortsIndex !== null}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: "10px", border: "none",
                            background: isGenerating ? "#94a3b8" : "linear-gradient(135deg, #FF5722, #FF7A00)",
                            color: "#fff", fontWeight: 800, fontSize: "0.78rem", cursor: isGenerating ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                            boxShadow: "0 2px 8px rgba(255,87,34,0.25)"
                          }}
                        >
                          <Smartphone size={14} className={isGenerating ? "animate-spin" : ""} />
                          {isGenerating ? "Renderizando Shorts..." : "📱 Gerar Shorts 9:16"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

        </div>
      )}

      {/* Modal Shorts Vertical 9:16 Player */}
      {shortsModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: "1.5rem"
        }}>
          <div style={{
            background: "#1e1e24", borderRadius: "24px", padding: "1.5rem",
            maxWidth: "420px", width: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", position: "relative", border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            <button
              onClick={() => setShortsModal(null)}
              style={{
                position: "absolute", top: "16px", right: "16px",
                background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
                borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              <X size={20} />
            </button>

            <div style={{ color: "#FF5722", fontWeight: 800, fontSize: "0.85rem", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              📱 Shorts / Reels 9:16
            </div>
            <h4 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem 0", textAlign: "center", padding: "0 30px" }}>
              {shortsModal.productName}
            </h4>

            {/* Video Player 9:16 */}
            <div style={{ width: "270px", height: "480px", borderRadius: "18px", overflow: "hidden", background: "#000", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              <video
                src={shortsModal.videoUrl}
                controls
                autoPlay
                playsInline
                loop
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", gap: "10px", width: "100%" }}>
              <a
                href={shortsModal.videoUrl}
                download={shortsModal.filename}
                style={{
                  flex: 1, padding: "0.75rem 1rem", borderRadius: "12px",
                  background: "linear-gradient(135deg, #FF5722, #FF7A00)", color: "#fff",
                  fontWeight: 800, fontSize: "0.9rem", textDecoration: "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  boxShadow: "0 4px 14px rgba(255,87,34,0.4)"
                }}
              >
                <Download size={18} /> Baixar Vídeo MP4
              </a>
              <button
                onClick={() => setShortsModal(null)}
                style={{
                  padding: "0.75rem 1.25rem", borderRadius: "12px", border: "1px solid #475569",
                  background: "transparent", color: "#cbd5e1", fontWeight: 700, fontSize: "0.9rem",
                  cursor: "pointer"
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
