"use client";

import { useState, useEffect } from "react";
import {
  Film,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  Download,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Trash2,
  Zap,
  Video,
  Eye,
  Link as LinkIcon
} from "lucide-react";

interface DarkVideoItem {
  id: string;
  productId?: string | null;
  productName: string;
  categoryName?: string | null;
  price?: number | null;
  affiliateLink?: string | null;
  imageUrl?: string | null;
  sellerVideoUrl?: string | null;
  scriptText?: string | null;
  captionText?: string | null;
  videoUrl?: string | null;
  durationSeconds?: number | null;
  status: "novo" | "renderizando" | "em_revisao" | "aprovado" | "rejeitado";
  qualityAudit?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface Counts {
  total: number;
  novo: number;
  renderizando: number;
  em_revisao: number;
  aprovado: number;
  rejeitado: number;
}

export function DarkVideoPipeline() {
  const [items, setItems] = useState<DarkVideoItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, novo: 0, renderizando: 0, em_revisao: 0, aprovado: 0, rejeitado: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("em_revisao");
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<DarkVideoItem | null>(null);
  const [modalVideoTab, setModalVideoTab] = useState<"dark" | "seller">("dark");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncingFlash, setSyncingFlash] = useState(false);
  const [generatingAiId, setGeneratingAiId] = useState<string | null>(null);
  const [extractingVideoId, setExtractingVideoId] = useState<string | null>(null);

  // Extrator direto por link
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [extractingCustom, setExtractingCustom] = useState(false);
  const [extractedCustomVideo, setExtractedCustomVideo] = useState<any | null>(null);

  const isCloud = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

  const handleExtractSellerVideo = async (darkVideoId: string) => {
    try {
      setExtractingVideoId(darkVideoId);
      const res = await fetch("/api/admin/shopee/extract-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ darkVideoId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Vídeo não encontrado para este anúncio.");
      }
      await fetchQueue();
      if (selectedVideo && selectedVideo.id === darkVideoId) {
        setSelectedVideo((prev: any) => ({
          ...prev,
          sellerVideoUrl: data.videoUrl,
        }));
      }
      alert("🎬 Vídeo original do vendedor capturado com sucesso!");
    } catch (e: any) {
      alert("Falha na extração do vídeo: " + e.message);
    } finally {
      setExtractingVideoId(null);
    }
  };

  const handleExtractCustomUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customUrlInput.trim()) return;
    try {
      setExtractingCustom(true);
      setExtractedCustomVideo(null);
      const res = await fetch("/api/admin/shopee/extract-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: customUrlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Vídeo não encontrado para este anúncio.");
      }
      setExtractedCustomVideo(data);
    } catch (e: any) {
      alert("Erro ao extrair vídeo: " + e.message);
    } finally {
      setExtractingCustom(false);
    }
  };

  const handleAddCustomToQueue = async () => {
    if (!extractedCustomVideo) return;
    try {
      const res = await fetch("/api/admin/dark-video/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: extractedCustomVideo.title || "Achadinho da Shopee",
          affiliateLink: customUrlInput.trim(),
          sellerVideoUrl: extractedCustomVideo.videoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao adicionar");
      alert("🎉 Vídeo do vendedor adicionado à esteira de vídeos dark!");
      setCustomUrlInput("");
      setExtractedCustomVideo(null);
      await fetchQueue();
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  };

  const handleGenerateGeminiScript = async (id: string) => {
    try {
      setGeneratingAiId(id);
      const res = await fetch("/api/admin/dark-video/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar roteiro");
      await fetchQueue();
      if (selectedVideo && selectedVideo.id === id) {
        setSelectedVideo((prev: any) => ({
          ...prev,
          scriptText: data.script,
          captionText: data.caption,
        }));
      }
      alert("✨ Roteiro e legenda gerados com sucesso pelo Google Gemini AI!");
    } catch (e: any) {
      alert("Erro ao chamar Gemini: " + e.message);
    } finally {
      setGeneratingAiId(null);
    }
  };

  const handleSyncLiveFlashDeals = async () => {
    const inputUrl = prompt(
      "Cole o link da página de Ofertas Relâmpago da Shopee (ou deixe vazio para puxar a sessão ao vivo de agora):",
      "https://shopee.com.br/flash_sale?promotionId=514572205371541"
    );
    if (inputUrl === null) return;

    try {
      setSyncingFlash(true);
      const res = await fetch("/api/admin/shopee/sync-flash-deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl.trim() || undefined, limit: 30, addToDarkQueue: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao puxar ofertas relâmpago");
      alert(`⚡ Sucesso! ${data.totalFetched || 0} ofertas relâmpago oficiais da Shopee sincronizadas e ${data.darkQueueCount || 0} novos produtos entraram na esteira dark!`);
      await fetchQueue();
    } catch (err: any) {
      alert("Falha: " + err.message);
    } finally {
      setSyncingFlash(false);
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/admin/dark-video/queue?status=${filterStatus}`);
      const data = await res.json();
      if (data.items) setItems(data.items);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error("Erro ao carregar fila:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filterStatus]);

  // Processa um vídeo específico ou o próximo da fila
  const handleProcessVideo = async (id?: string) => {
    if (isCloud) {
      alert("A renderização de vídeos com FFmpeg e voz neural roda no seu computador local em http://localhost:3000/admin/youtube para usar o processador da sua máquina com taxa de renderização ultrarrápida e custo zero. Aqui na nuvem, você pode adicionar produtos à esteira e sincronizar ofertas!");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/dark-video/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        // Se estiver aprovando ou revisando, atualiza a lista
        await fetchQueue();
        if (data.item.status === "em_revisao") {
          setSelectedVideo(data.item);
        }
      } else {
        alert(data.error || data.message || "Erro ao processar vídeo.");
      }
    } catch (err: any) {
      alert("Erro na conexão: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Processamento contínuo em lote (1 por vez)
  useEffect(() => {
    let cancel = false;
    async function runBatch() {
      if (!batchMode || isProcessing) return;
      if (counts.novo === 0) {
        setBatchMode(false);
        return;
      }
      setIsProcessing(true);
      try {
        const res = await fetch("/api/admin/dark-video/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.success) {
          await fetchQueue();
        } else {
          setBatchMode(false);
        }
      } catch {
        setBatchMode(false);
      } finally {
        if (!cancel) setIsProcessing(false);
      }
    }
    if (batchMode && !isProcessing) {
      runBatch();
    }
    return () => { cancel = true; };
  }, [batchMode, isProcessing, counts.novo]);

  // Atualizar status (Aprovar / Rejeitar)
  const handleUpdateStatus = async (id: string, status: "aprovado" | "rejeitado") => {
    try {
      const res = await fetch("/api/admin/dark-video/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedVideo?.id === id) {
          setSelectedVideo(null);
        }
        await fetchQueue();
      }
    } catch (err: any) {
      alert("Erro ao atualizar status: " + err.message);
    }
  };

  // Deletar item
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este vídeo da esteira?")) return;
    try {
      await fetch(`/api/admin/dark-video/queue?id=${id}`, { method: "DELETE" });
      if (selectedVideo?.id === id) setSelectedVideo(null);
      await fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  // Puxar produtos do banco para a fila
  const handlePopulateQueue = async () => {
    try {
      setLoading(true);
      const resProds = await fetch("/api/products?limit=15");
      const dataProds = await resProds.json();
      const prods = dataProds.products || dataProds || [];
      const productIds = prods.map((p: any) => p.id);

      if (!productIds.length) {
        alert("Nenhum produto cadastrado no banco para colocar na fila.");
        return;
      }

      const res = await fetch("/api/admin/dark-video/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });
      const data = await res.json();
      alert(`🎉 ${data.count || 0} produtos adicionados à fila de vídeos dark!`);
      await fetchQueue();
    } catch (err: any) {
      alert("Erro ao abastecer fila: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      {/* Banner da Esteira de Produção */}
      <div style={{
        background: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)",
        borderRadius: "24px",
        padding: "2rem",
        border: "1px solid rgba(255, 87, 34, 0.25)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
        color: "#fff",
        marginBottom: "2rem"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255, 87, 34, 0.15)", border: "1px solid rgba(255,87,34,0.4)", padding: "4px 12px", borderRadius: "100px", color: "#FF7A00", fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Sparkles size={14} /> Esteira de Vídeos Dark • 100% Grátis (R$ 0)
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.4)", padding: "4px 12px", borderRadius: "100px", color: "#60a5fa", fontWeight: 800, fontSize: "0.78rem" }}>
                <Sparkles size={13} /> ✨ Roteiros IA via Google Gemini Ativo
              </div>
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 900, margin: "0 0 8px 0", color: "#ffffff", letterSpacing: "-0.02em" }}>
              Fábrica Automática de Shorts & Reels
            </h2>
            <p style={{ color: "#a1a1aa", fontSize: "0.95rem", maxWidth: "680px", margin: 0, lineHeight: 1.6 }}>
              Produção local com FFmpeg otimizado, narração neural TechZone (pt-BR) e <strong>auditoria técnica automática</strong> antes da sua aprovação final.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleSyncLiveFlashDeals}
              disabled={syncingFlash || isProcessing}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
                border: "none", padding: "10px 18px", borderRadius: "14px", color: "#fff",
                fontWeight: 800, fontSize: "0.88rem", cursor: syncingFlash || isProcessing ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(220, 38, 38, 0.35)",
              }}
            >
              <Zap size={16} className={syncingFlash ? "animate-spin" : ""} />
              {syncingFlash ? "Puxando Ofertas..." : "⚡ Puxar Ofertas Relâmpago Shopee"}
            </button>

            <button
              onClick={handlePopulateQueue}
              disabled={loading || isProcessing}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)",
                padding: "10px 18px", borderRadius: "14px", color: "#fff",
                fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
              }}
            >
              <Plus size={16} /> Abastecer do Catálogo
            </button>

            <button
              onClick={() => handleProcessVideo()}
              disabled={isProcessing || counts.novo === 0}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "linear-gradient(135deg, #FF5722 0%, #FF8A00 100%)",
                border: "none", padding: "10px 20px", borderRadius: "14px", color: "#fff",
                fontWeight: 800, fontSize: "0.88rem", cursor: isProcessing || counts.novo === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(255,87,34,0.4)"
              }}
            >
              <RefreshCw size={16} className={isProcessing ? "animate-spin" : ""} />
              {isProcessing ? "Renderizando Vídeo..." : `Renderizar Próximo (${counts.novo})`}
            </button>

            <button
              onClick={() => setBatchMode(!batchMode)}
              disabled={counts.novo === 0}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: batchMode ? "#ef4444" : "#10b981",
                border: "none", padding: "10px 18px", borderRadius: "14px", color: "#fff",
                fontWeight: 800, fontSize: "0.88rem", cursor: counts.novo === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(16,185,129,0.3)"
              }}
            >
              <Play size={16} />
              {batchMode ? "Pausar Lote" : "Renderizar Fila em Lote (1 por 1)"}
            </button>
          </div>
        </div>

        {/* Puxador Instantâneo de Vídeo do Vendedor Shopee */}
        <div style={{
          marginTop: "1.5rem",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "18px",
          padding: "1.25rem 1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#FF7A00", fontWeight: 800, fontSize: "0.95rem", marginBottom: "4px" }}>
            <Video size={18} /> Puxador de Vídeo do Vendedor (Shopee Oficial)
          </div>
          <p style={{ margin: "0 0 12px 0", color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.5 }}>
            Cole qualquer link de produto ou link de afiliado da Shopee (ex: <code style={{ color: "#38bdf8" }}>https://s.shopee.com.br/...</code> ou <code style={{ color: "#38bdf8" }}>https://shopee.com.br/product/...</code>) para baixar o vídeo original publicado pelo vendedor em MP4 sem marca d&apos;água.
          </p>

          <form onSubmit={handleExtractCustomUrl} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Cole o link do produto ou link de afiliado da Shopee aqui..."
              style={{
                flex: 1, minWidth: "260px", padding: "12px 16px", borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)", background: "rgba(0, 0, 0, 0.4)",
                color: "#fff", fontSize: "0.9rem", outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={extractingCustom || !customUrlInput.trim()}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "12px 22px", borderRadius: "12px", border: "none",
                background: "linear-gradient(135deg, #FF5722 0%, #FF7A00 100%)",
                color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: extractingCustom || !customUrlInput.trim() ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(255,87,34,0.35)", whiteSpace: "nowrap"
              }}
            >
              <RefreshCw size={16} className={extractingCustom ? "animate-spin" : ""} />
              {extractingCustom ? "Extraindo Vídeo..." : "🎬 Puxar Vídeo"}
            </button>
          </form>

          {/* Resultado do Vídeo Extraído */}
          {extractedCustomVideo && (
            <div style={{
              marginTop: "1.25rem", padding: "1.25rem", borderRadius: "14px",
              background: "rgba(0,0,0,0.5)", border: "1px solid rgba(16, 185, 129, 0.35)",
              display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap"
            }}>
              <div style={{ width: "150px", height: "200px", borderRadius: "12px", overflow: "hidden", background: "#000", flexShrink: 0 }}>
                <video
                  src={extractedCustomVideo.videoUrl}
                  controls
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <div style={{ display: "inline-block", background: "#dcfce7", color: "#15803d", fontSize: "0.75rem", fontWeight: 800, padding: "3px 10px", borderRadius: "6px", marginBottom: "8px" }}>
                  ✅ VÍDEO DO VENDEDOR CAPTURADO (MP4 DIRETO)
                </div>
                <h4 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "1rem", fontWeight: 700 }}>
                  {extractedCustomVideo.title || "Produto Shopee"}
                </h4>
                <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginBottom: "12px", wordBreak: "break-all" }}>
                  CDN Shopee: {extractedCustomVideo.videoUrl}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <a
                    href={extractedCustomVideo.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    download="shopee-video-vendedor.mp4"
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      background: "#10b981", color: "#fff", padding: "10px 18px", borderRadius: "10px",
                      fontSize: "0.85rem", fontWeight: 800, textDecoration: "none"
                    }}
                  >
                    <Download size={15} /> Baixar Vídeo MP4
                  </a>
                  <button
                    type="button"
                    onClick={handleAddCustomToQueue}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                      color: "#fff", padding: "10px 18px", borderRadius: "10px",
                      fontSize: "0.85rem", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    <Plus size={15} /> Adicionar à Fila de Vídeos Dark
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contadores da Fila */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginTop: "1.75rem" }}>
          {[
            { label: "Na Fila (Novos)", count: counts.novo, color: "#f59e0b", icon: Clock },
            { label: "Renderizando", count: counts.renderizando, color: "#6366f1", icon: RefreshCw },
            { label: "Aguardando Revisão", count: counts.em_revisao, color: "#FF5722", icon: AlertTriangle },
            { label: "Aprovados", count: counts.aprovado, color: "#10b981", icon: CheckCircle },
            { label: "Total Gerados", count: counts.total, color: "#38bdf8", icon: Film },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "1rem", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: c.color, marginBottom: "4px" }}>
                  <Icon size={16} />
                  <span style={{ fontSize: "1.5rem", fontWeight: 900 }}>{c.count}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#a1a1aa", fontWeight: 600 }}>{c.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navegação por Abas de Status */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {[
          { key: "em_revisao", label: `Aguardando Sua Revisão (${counts.em_revisao})` },
          { key: "novo", label: `Na Fila (${counts.novo})` },
          { key: "aprovado", label: `Aprovados para Postar (${counts.aprovado})` },
          { key: "todos", label: `Todos (${counts.total})` },
          { key: "rejeitado", label: `Rejeitados (${counts.rejeitado})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            style={{
              padding: "8px 16px", borderRadius: "12px", border: "none",
              background: filterStatus === tab.key ? "#FF5722" : "#f1f5f9",
              color: filterStatus === tab.key ? "#fff" : "#475569",
              fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de Itens */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px auto" }} />
          Carregando esteira...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#f8fafc", borderRadius: "20px", border: "1px dashed #cbd5e1" }}>
          <Smartphone size={40} style={{ color: "#94a3b8", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 6px 0", color: "#1e293b", fontWeight: 800 }}>Nenhum vídeo neste status</h3>
          <p style={{ margin: "0 0 1rem 0", color: "#64748b", fontSize: "0.9rem" }}>
            Clique em <strong>"Abastecer com Produtos"</strong> ou processe os itens da fila acima.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {items.map((item) => {
            let audit: any = null;
            if (item.qualityAudit) {
              try { audit = JSON.parse(item.qualityAudit); } catch {}
            }

            return (
              <div
                key={item.id}
                style={{
                  background: "#fff",
                  borderRadius: "18px",
                  border: item.status === "em_revisao" ? "2px solid #FF5722" : "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: item.status === "em_revisao" ? "0 8px 24px rgba(255,87,34,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between"
                }}
              >
                <div>
                  {/* Topo com Foto e Badge */}
                  <div style={{ display: "flex", gap: "12px", padding: "1.25rem", borderBottom: "1px solid #f8fafc" }}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        style={{ width: "70px", height: "70px", borderRadius: "12px", objectFit: "cover", flexShrink: 0, border: "1px solid #e2e8f0" }}
                      />
                    ) : (
                      <div style={{ width: "70px", height: "70px", borderRadius: "12px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                        <Film size={24} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                        <span style={{ fontSize: "0.72rem", color: "#FF5722", fontWeight: 800, textTransform: "uppercase" }}>
                          {item.categoryName || "Achadinhos"}
                        </span>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {item.sellerVideoUrl && (
                            <span style={{
                              fontSize: "0.68rem", fontWeight: 800, padding: "2px 6px", borderRadius: "6px",
                              background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", gap: "3px"
                            }}>
                              <Video size={10} /> Vídeo Shopee
                            </span>
                          )}
                          <span style={{
                            fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: "6px",
                            background: item.status === "aprovado" ? "#dcfce7" : item.status === "em_revisao" ? "#ffedd5" : item.status === "novo" ? "#fef3c7" : "#f1f5f9",
                            color: item.status === "aprovado" ? "#15803d" : item.status === "em_revisao" ? "#c2410c" : item.status === "novo" ? "#b45309" : "#475569"
                          }}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <h4 style={{ margin: "4px 0", fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.productName}
                      </h4>

                      <div style={{ fontWeight: 900, color: "#FF5722", fontSize: "1rem" }}>
                        {item.price ? `R$ ${item.price.toFixed(2).replace(".", ",")}` : "Preço sob consulta"}
                      </div>
                    </div>
                  </div>

                  {/* Auditoria Técnica */}
                  {audit && (
                    <div style={{ padding: "0.75rem 1.25rem", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", fontSize: "0.78rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: audit.passed ? "#16a34a" : "#dc2626", fontWeight: 800, marginBottom: "2px" }}>
                        {audit.passed ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                        {audit.passed ? "Auditoria Técnica Aprovada" : "Alerta de Qualidade"}
                      </div>
                      <div style={{ color: "#64748b", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <span>⏱️ {audit.duration}s</span>
                        <span>📐 {audit.resolution}</span>
                        <span>💾 {audit.sizeMb} MB</span>
                        <span>🔊 Áudio {audit.audioCodec}</span>
                      </div>
                    </div>
                  )}

                  {/* Prévia do Roteiro */}
                  {item.scriptText && (
                    <div style={{ padding: "0.75rem 1.25rem", fontSize: "0.82rem", color: "#475569", lineHeight: 1.5, background: "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                      <strong style={{ color: "#0f172a", display: "block", marginBottom: "2px" }}>Roteiro da Voz:</strong>
                      <p style={{ margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.scriptText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Ações do Card */}
                <div style={{ padding: "1rem 1.25rem", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                  {/* Botão Gerar Roteiro com Gemini AI */}
                  <button
                    onClick={() => handleGenerateGeminiScript(item.id)}
                    disabled={generatingAiId === item.id}
                    style={{
                      flex: 1, padding: "8px 14px", borderRadius: "10px", border: "none",
                      background: generatingAiId === item.id ? "#64748b" : "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff",
                      fontWeight: 800, fontSize: "0.82rem", cursor: generatingAiId === item.id ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
                    }}
                  >
                    <Sparkles size={14} className={generatingAiId === item.id ? "animate-spin" : ""} />
                    {generatingAiId === item.id ? "Gemini gerando..." : "✨ Roteiro IA"}
                  </button>

                  {item.status === "novo" && (
                    <button
                      onClick={() => handleProcessVideo(item.id)}
                      disabled={isProcessing}
                      style={{
                        flex: 1, padding: "8px 14px", borderRadius: "10px", border: "none",
                        background: "linear-gradient(135deg, #FF5722, #FF7A00)", color: "#fff",
                        fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                      }}
                    >
                      <Film size={14} /> Renderizar Vídeo
                    </button>
                  )}

                  {item.videoUrl && (
                    <button
                      onClick={() => setSelectedVideo(item)}
                      style={{
                        flex: 1, padding: "8px 14px", borderRadius: "10px", border: "none",
                        background: "#0f172a", color: "#fff",
                        fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                      }}
                    >
                      <Play size={14} /> Assistir 9:16
                    </button>
                  )}

                  {/* Botão Vídeo Original do Vendedor */}
                  {item.sellerVideoUrl ? (
                    <button
                      onClick={() => {
                        setSelectedVideo(item);
                        setModalVideoTab("seller");
                      }}
                      style={{
                        padding: "8px 12px", borderRadius: "10px", border: "1px solid #bbf7d0",
                        background: "#f0fdf4", color: "#16a34a",
                        fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "4px"
                      }}
                      title="Ver Vídeo Original do Vendedor"
                    >
                      <Video size={14} /> Vídeo Shopee
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExtractSellerVideo(item.id)}
                      disabled={extractingVideoId === item.id}
                      style={{
                        padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1",
                        background: "#fff", color: "#475569",
                        fontWeight: 700, fontSize: "0.82rem", cursor: extractingVideoId === item.id ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: "4px"
                      }}
                      title="Puxar Vídeo Original do Vendedor da Shopee"
                    >
                      <RefreshCw size={14} className={extractingVideoId === item.id ? "animate-spin" : ""} />
                      {extractingVideoId === item.id ? "Puxando..." : "📹 Puxar Vídeo"}
                    </button>
                  )}

                  {item.captionText && (
                    <button
                      onClick={() => copyToClipboard(item.captionText!, item.id)}
                      style={{
                        padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1",
                        background: "#fff", color: "#334155",
                        fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "4px"
                      }}
                      title="Copiar Legenda Pronta"
                    >
                      {copiedId === item.id ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      Legenda
                    </button>
                  )}

                  {item.status === "em_revisao" && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, "aprovado")}
                      style={{
                        padding: "8px 12px", borderRadius: "10px", border: "none",
                        background: "#16a34a", color: "#fff",
                        fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "4px"
                      }}
                      title="Aprovar para Publicação"
                    >
                      <CheckCircle size={14} /> Aprovar
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: "8px", borderRadius: "10px", border: "1px solid #fee2e2",
                      background: "#fff", color: "#ef4444", cursor: "pointer",
                    }}
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Player de Revisão e Aprovação 9:16 */}
      {selectedVideo && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 99999, padding: "1.5rem"
        }}>
          <div style={{
            background: "#18181b", borderRadius: "24px", padding: "1.75rem",
            maxWidth: "760px", width: "100%", maxHeight: "90vh", overflowY: "auto",
            display: "flex", gap: "1.5rem", flexWrap: "wrap", position: "relative",
            border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            color: "#fff"
          }}>
            <button
              onClick={() => setSelectedVideo(null)}
              style={{
                position: "absolute", top: "16px", right: "16px",
                background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
                borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              ✕
            </button>

            {/* Coluna da Esquerda: Player */}
            <div style={{ width: "270px", flexShrink: 0 }}>
              {/* Abas Dark / Vendedor se ambos existirem */}
              {(selectedVideo.videoUrl && selectedVideo.sellerVideoUrl) && (
                <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                  <button
                    onClick={() => setModalVideoTab("dark")}
                    style={{
                      flex: 1, padding: "6px", borderRadius: "8px", border: "none",
                      background: modalVideoTab === "dark" ? "#FF5722" : "rgba(255,255,255,0.1)",
                      color: "#fff", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer"
                    }}
                  >
                    Dark 9:16
                  </button>
                  <button
                    onClick={() => setModalVideoTab("seller")}
                    style={{
                      flex: 1, padding: "6px", borderRadius: "8px", border: "none",
                      background: modalVideoTab === "seller" ? "#10b981" : "rgba(255,255,255,0.1)",
                      color: "#fff", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer"
                    }}
                  >
                    Vendedor Shopee
                  </button>
                </div>
              )}

              {/* Tag indicativa */}
              <div style={{ fontSize: "0.72rem", color: "#a1a1aa", marginBottom: "6px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                <Video size={12} color={modalVideoTab === "seller" || !selectedVideo.videoUrl ? "#10b981" : "#FF5722"} />
                {modalVideoTab === "seller" || !selectedVideo.videoUrl
                  ? "Vídeo Original do Vendedor (Shopee CDN)"
                  : "Vídeo Dark Renderizado (9:16 com Voz)"}
              </div>

              <div style={{ width: "270px", height: "480px", borderRadius: "20px", overflow: "hidden", background: "#000", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                <video
                  key={(modalVideoTab === "seller" || !selectedVideo.videoUrl) ? selectedVideo.sellerVideoUrl : selectedVideo.videoUrl}
                  src={(modalVideoTab === "seller" || !selectedVideo.videoUrl) ? (selectedVideo.sellerVideoUrl || "") : (selectedVideo.videoUrl || "")}
                  controls
                  autoPlay
                  loop
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <a
                  href={(modalVideoTab === "seller" || !selectedVideo.videoUrl) ? (selectedVideo.sellerVideoUrl || "") : (selectedVideo.videoUrl || "")}
                  download={`video-${selectedVideo.id}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    width: "100%", padding: "10px", borderRadius: "12px",
                    background: (modalVideoTab === "seller" || !selectedVideo.videoUrl)
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "linear-gradient(135deg, #FF5722, #FF7A00)",
                    color: "#fff",
                    fontWeight: 800, fontSize: "0.85rem", textDecoration: "none"
                  }}
                >
                  <Download size={16} /> Baixar Vídeo MP4
                </a>
              </div>
            </div>

            {/* Coluna da Direita: Dados, Roteiro e Aprovação */}
            <div style={{ flex: 1, minWidth: "280px" }}>
              <div style={{ color: "#FF5722", fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase" }}>
                Revisão Humana de Vídeo Dark
              </div>
              <h3 style={{ margin: "4px 0 10px 0", fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>
                {selectedVideo.productName}
              </h3>

              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "14px", padding: "1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
                <div style={{ color: "#a1a1aa", marginBottom: "4px" }}>💰 Preço Verificado: <strong style={{ color: "#FF7A00" }}>{selectedVideo.price ? `R$ ${selectedVideo.price.toFixed(2).replace(".", ",")}` : "Sob consulta"}</strong></div>
                <div style={{ color: "#a1a1aa", wordBreak: "break-all" }}>🔗 Link de Afiliado: <a href={selectedVideo.affiliateLink || "#"} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>{selectedVideo.affiliateLink || "Link da loja"}</a></div>
                {!selectedVideo.sellerVideoUrl && (
                  <div style={{ marginTop: "10px" }}>
                    <button
                      onClick={() => handleExtractSellerVideo(selectedVideo.id)}
                      disabled={extractingVideoId === selectedVideo.id}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#38bdf8", padding: "8px 14px", borderRadius: "10px",
                        fontSize: "0.82rem", fontWeight: 700, cursor: extractingVideoId === selectedVideo.id ? "not-allowed" : "pointer"
                      }}
                    >
                      <RefreshCw size={14} className={extractingVideoId === selectedVideo.id ? "animate-spin" : ""} />
                      {extractingVideoId === selectedVideo.id ? "Puxando vídeo da Shopee..." : "📹 Puxar Vídeo Original do Vendedor"}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#a1a1aa", fontWeight: 700 }}>Legenda Pronta (Shorts/TikTok/Reels):</span>
                  <button
                    onClick={() => copyToClipboard(selectedVideo.captionText || "", "modal-caption")}
                    style={{
                      background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
                      padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "4px"
                    }}
                  >
                    {copiedId === "modal-caption" ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    Copiar Legenda
                  </button>
                </div>
                <textarea
                  readOnly
                  value={selectedVideo.captionText || ""}
                  rows={5}
                  style={{
                    width: "100%", background: "#09090b", color: "#e4e4e7", border: "1px solid #27272a",
                    borderRadius: "10px", padding: "10px", fontSize: "0.78rem", resize: "none", outline: "none"
                  }}
                />
              </div>

              {/* Botões de Decisão */}
              <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                <button
                  onClick={() => handleUpdateStatus(selectedVideo.id, "aprovado")}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "12px", border: "none",
                    background: "#16a34a", color: "#fff", fontWeight: 800, fontSize: "0.95rem",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    boxShadow: "0 4px 14px rgba(22,163,74,0.4)"
                  }}
                >
                  <CheckCircle size={18} /> Aprovar Vídeo para Postar
                </button>

                <button
                  onClick={() => handleUpdateStatus(selectedVideo.id, "rejeitado")}
                  style={{
                    padding: "12px 18px", borderRadius: "12px", border: "1px solid #ef4444",
                    background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 800, fontSize: "0.9rem",
                    cursor: "pointer"
                  }}
                >
                  Rejeitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
