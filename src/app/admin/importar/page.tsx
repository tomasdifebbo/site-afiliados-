"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  Package,
  Trash2,
  Zap,
  CheckCircle2,
  Folder,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Search,
  Sparkles,
  TrendingUp,
  Percent,
  Star,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle
} from "lucide-react";

export default function ShopeeImporterPage() {
  const [activeTab, setActiveTab] = useState<"api" | "manual">("api");

  // API Search State
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchSortType, setSearchSortType] = useState<number>(2); // 2 = mais vendidos
  const [searchLimit, setSearchLimit] = useState<number>(20);
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [importingApi, setImportingApi] = useState(false);

  // Manual / Legacy State
  const [inputText, setInputText] = useState("");
  const [bulkLinks, setBulkLinks] = useState("");
  const [parsedProducts, setParsedProducts] = useState<any[]>([]);
  const [defaultPriceInput, setDefaultPriceInput] = useState<string>("");

  // Shared State
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("eletrodomesticos");
  const [successInfo, setSuccessInfo] = useState<{ count: number; categoryName: string; categorySlug: string; skipped?: number } | null>(null);

  const loadCategories = () => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) {
          setCategories(data.categories);
          if (data.categories.length > 0 && !selectedCategory) {
            const hasEletro = data.categories.find((c: any) => c.slug === "eletrodomesticos");
            setSelectedCategory(hasEletro ? "eletrodomesticos" : data.categories[0].slug);
          }
        }
      })
      .catch(err => console.error("Erro ao carregar categorias", err));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // API Search Handler
  const handleSearchApi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchKeyword.trim();
    if (!q) {
      alert("Digite uma palavra-chave para buscar na Shopee.");
      return;
    }

    setSearching(true);
    setSuccessInfo(null);
    try {
      const res = await fetch(`/api/admin/shopee/search?keyword=${encodeURIComponent(q)}&sortType=${searchSortType}&limit=${searchLimit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao buscar na Shopee.");

      setApiResults(data.nodes || []);
      // Pre-select all items that are NOT already imported
      const newSelected = new Set<string>();
      (data.nodes || []).forEach((n: any) => {
        if (!n.alreadyImported) {
          newSelected.add(String(n.itemId));
        }
      });
      setSelectedItemIds(newSelected);
    } catch (err: any) {
      alert("Erro na busca da Shopee: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleToggleSelectAll = () => {
    const nonImported = apiResults.filter(r => !r.alreadyImported);
    if (selectedItemIds.size === nonImported.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(nonImported.map(r => String(r.itemId))));
    }
  };

  const handleToggleItem = (itemId: string) => {
    const updated = new Set(selectedItemIds);
    if (updated.has(itemId)) {
      updated.delete(itemId);
    } else {
      updated.add(itemId);
    }
    setSelectedItemIds(updated);
  };

  const handleImportSelectedFromApi = async () => {
    const itemsToImport = apiResults.filter(r => selectedItemIds.has(String(r.itemId)));
    if (itemsToImport.length === 0) {
      alert("Selecione pelo menos um produto para importar.");
      return;
    }

    setImportingApi(true);
    setSuccessInfo(null);

    try {
      const res = await fetch("/api/admin/shopee/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug: selectedCategory,
          items: itemsToImport,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar produtos.");

      setSuccessInfo({
        count: data.count,
        categoryName: data.categoryName,
        categorySlug: data.categorySlug,
        skipped: data.skippedCount,
      });

      // Update alreadyImported in current view
      const newlyImportedIds = new Set(itemsToImport.map(i => String(i.itemId)));
      setApiResults(prev => prev.map(p => newlyImportedIds.has(String(p.itemId)) ? { ...p, alreadyImported: true } : p));
      setSelectedItemIds(new Set());
      loadCategories();
    } catch (err: any) {
      alert("Erro ao importar produtos: " + err.message);
    } finally {
      setImportingApi(false);
    }
  };

  const handleClearAllProducts = async () => {
    if (!confirm("⚠️ Tem certeza que deseja excluir TODOS os produtos do site? Essa ação não pode ser desfeita.")) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/import', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.deletedCount} produtos foram excluídos do site!`);
        setSuccessInfo(null);
        loadCategories();
      }
    } catch (e: any) {
      alert("Erro ao excluir produtos: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Legacy manual parser
  const handleParse = () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      alert("Por favor, cole os dados antes de carregar.");
      return;
    }

    setSuccessInfo(null);

    // JSON parsing
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : (parsed.products || []);
        const jsonProducts = list.map((p: any) => {
          let price = 0;
          if (typeof p.price === 'number') {
            price = p.price;
          } else if (p.price) {
            const m = String(p.price).match(/[\d.,]+/);
            if (m) price = parseFloat(m[0].replace(/\./g, '').replace(',', '.')) || 0;
          }

          return {
            id: p.id || Math.random().toString(36).substr(2, 9),
            itemId: p.itemId || p.id || "",
            shopId: p.shopId || "",
            name: (p.name || "").trim(),
            price: price,
            imageUrl: p.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop",
            affiliateLink: p.affiliateLink || "",
          };
        }).filter((p: any) => p.name);

        setParsedProducts(jsonProducts);
        return;
      } catch (e) {
        console.error("Invalid JSON", e);
      }
    }

    alert("Formato não reconhecido. Certifique-se de colar o JSON gerado pelo extrator.");
  };

  const applyDefaultPriceToZeroes = () => {
    const val = parseFloat(defaultPriceInput.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert("Digite um valor válido, ex: 39.90");
      return;
    }
    setParsedProducts(prev => prev.map(p => (!p.price || p.price === 0) ? { ...p, price: val } : p));
    alert(`Preço de R$ ${val.toFixed(2)} aplicado aos produtos zerados!`);
  };

  const handleSaveAllManual = async () => {
    const validProducts = parsedProducts.filter(p => p.name && p.name.trim().length > 0);
    if (validProducts.length === 0) {
      alert("Nenhum produto na fila para publicar.");
      return;
    }

    setLoading(true);
    setSuccessInfo(null);

    try {
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          products: validProducts,
          categorySlug: selectedCategory 
        }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setSuccessInfo({
          count: resData.count || validProducts.length,
          categoryName: resData.categoryName || "Categoria",
          categorySlug: resData.categorySlug || selectedCategory
        });
        setParsedProducts([]);
        setInputText("");
        loadCategories();
      } else {
        alert("Erro ao importar: " + (resData.error || "Tente novamente."));
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao conectar com o servidor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentCatObj = categories.find(c => c.slug === selectedCategory);

  return (
    <div style={{ padding: '2.5rem', backgroundColor: 'hsl(var(--background))', minHeight: '100%', color: '#000' }}>
      
      {/* Top Banner / Heading */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#059669', padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px' }}>
            <Zap size={14} fill="#059669" /> Shopee Open API Conectada
          </div>
          <h1 style={{ fontSize: '2.3rem', fontWeight: 900, color: '#000', margin: 0 }}>Importador Oficial Shopee</h1>
          <p style={{ color: '#555', fontWeight: 600, marginTop: '4px' }}>Importe diretamente da Shopee com fotos HD, preços e links oficiais de afiliado.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleClearAllProducts}
            disabled={loading || importingApi}
            style={{
              padding: '0.9rem 1.3rem',
              borderRadius: '18px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '2px solid #fca5a5',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Trash2 size={18} /> Limpar Banco
          </button>

          {/* Category Selector Widget */}
          <div className="glass shadow-premium" style={{ 
            padding: '0.9rem 1.4rem', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            background: '#fff', 
            border: '2px solid #FF6600',
            boxShadow: '0 8px 24px rgba(255, 102, 0, 0.12)'
          }}>
            <Folder size={24} style={{ color: '#FF6600' }} />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Categoria de Destino:
              </div>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ fontWeight: 900, fontSize: '1.05rem', color: '#000', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name} ({c._count?.products || 0} produtos)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', borderBottom: '2px solid #eee', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab("api")}
          style={{
            padding: '0.8rem 1.6rem',
            borderRadius: '14px 14px 0 0',
            border: 'none',
            background: activeTab === "api" ? '#FF6600' : 'transparent',
            color: activeTab === "api" ? '#fff' : '#666',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Zap size={18} fill={activeTab === "api" ? "white" : "none"} /> Importação Direta via API (Recomendado)
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          style={{
            padding: '0.8rem 1.6rem',
            borderRadius: '14px 14px 0 0',
            border: 'none',
            background: activeTab === "manual" ? '#000' : 'transparent',
            color: activeTab === "manual" ? '#fff' : '#666',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Copy size={18} /> Importador Manual / Robô
        </button>
      </div>

      {/* Success Notification Banner */}
      {successInfo && (
        <div style={{ 
          backgroundColor: '#ecfdf5', 
          border: '2px solid #10b981', 
          padding: '1.3rem 1.8rem', 
          borderRadius: '20px', 
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#065f46' }}>
                🎉 {successInfo.count} Produtos Adicionados com Sucesso!
              </h3>
              <p style={{ margin: '3px 0 0', color: '#047857', fontWeight: 600, fontSize: '0.9rem' }}>
                Publicados na categoria <strong>{successInfo.categoryName}</strong>.
                {successInfo.skipped ? ` (${successInfo.skipped} duplicados foram ignorados automaticamente).` : ""}
              </p>
            </div>
          </div>
          <a 
            href={`/categoria/${successInfo.categorySlug}`} 
            target="_blank"
            className="btn" 
            style={{ 
              backgroundColor: '#10b981', 
              color: '#fff', 
              fontWeight: 800, 
              padding: '0.75rem 1.4rem', 
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Ver no Site <ExternalLink size={16} />
          </a>
        </div>
      )}

      {/* TAB 1: SHOPEE OPEN API (DIRECT SEARCH & IMPORT) */}
      {activeTab === "api" && (
        <div>
          {/* Search Controls Card */}
          <div className="glass shadow-premium" style={{ padding: '2rem', borderRadius: '24px', background: '#fff', marginBottom: '2rem' }}>
            <form onSubmit={handleSearchApi} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr auto', gap: '1rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', color: '#333', marginBottom: '6px' }}>
                  🔍 O que você quer buscar na Shopee?
                </label>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Ex: Fone Bluetooth, Air Fryer, Relógio Smartwatch, Bolsa..."
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid #ddd', fontSize: '0.95rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', color: '#333', marginBottom: '6px' }}>
                  📊 Ordenar Resultados Por:
                </label>
                <select
                  value={searchSortType}
                  onChange={(e) => setSearchSortType(parseInt(e.target.value, 10))}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid #ddd', fontSize: '0.9rem', fontWeight: 700, backgroundColor: '#fff' }}
                >
                  <option value={2}>🔥 Mais Vendidos (Recomendado)</option>
                  <option value={5}>💰 Maior Taxa de Comissão ($$$)</option>
                  <option value={1}>🎯 Mais Relevantes</option>
                  <option value={4}>🏷️ Menor Preço</option>
                  <option value={3}>💎 Maior Preço</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.85rem', color: '#333', marginBottom: '6px' }}>
                  📦 Quantidade:
                </label>
                <select
                  value={searchLimit}
                  onChange={(e) => setSearchLimit(parseInt(e.target.value, 10))}
                  style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '14px', border: '2px solid #ddd', fontSize: '0.9rem', fontWeight: 700, backgroundColor: '#fff' }}
                >
                  <option value={10}>10 produtos</option>
                  <option value={20}>20 produtos</option>
                  <option value={50}>50 produtos</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={searching}
                className="btn btn-primary"
                style={{
                  padding: '0.85rem 1.6rem',
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  gap: '8px',
                  height: '48px',
                }}
              >
                {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {searching ? "Consultando Shopee..." : "Buscar Ofertas"}
              </button>
            </form>
          </div>

          {/* Results Section */}
          {apiResults.length > 0 && (
            <div className="glass shadow-premium" style={{ padding: '2rem', borderRadius: '24px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem' }}>
                    Ofertas Encontradas ({apiResults.length})
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>
                    {selectedItemIds.size} selecionado(s) para importar para <strong>{currentCatObj?.name}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={handleToggleSelectAll}
                    style={{
                      padding: '0.65rem 1.2rem',
                      borderRadius: '12px',
                      background: '#f3f4f6',
                      border: '1px solid #ddd',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckSquare size={16} /> Selecionar / Desmarcar Todos
                  </button>

                  <button
                    onClick={handleImportSelectedFromApi}
                    disabled={importingApi || selectedItemIds.size === 0}
                    style={{
                      padding: '0.8rem 1.8rem',
                      borderRadius: '14px',
                      background: selectedItemIds.size === 0 ? '#ccc' : '#10b981',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: '1rem',
                      cursor: selectedItemIds.size === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: selectedItemIds.size === 0 ? 'none' : '0 8px 20px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    {importingApi ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="white" />}
                    {importingApi ? "Importando..." : `🚀 Importar ${selectedItemIds.size} Produto(s)`}
                  </button>
                </div>
              </div>

              {/* Grid of Results */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                {apiResults.map((item) => {
                  const itemIdStr = String(item.itemId);
                  const isSelected = selectedItemIds.has(itemIdStr);
                  const isImported = item.alreadyImported;
                  const commPercent = Math.round((parseFloat(item.commissionRate) || 0) * 100);

                  return (
                    <div
                      key={itemIdStr}
                      onClick={() => !isImported && handleToggleItem(itemIdStr)}
                      style={{
                        padding: '1rem',
                        borderRadius: '18px',
                        border: isSelected ? '2px solid #FF6600' : '1px solid #e5e7eb',
                        backgroundColor: isImported ? '#f9fafb' : isSelected ? '#fff7ed' : '#fff',
                        cursor: isImported ? 'default' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        transition: 'all 0.2s',
                        opacity: isImported ? 0.65 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flexShrink: 0, width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#111', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                            {item.productName}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#FF6600' }}>
                              R$ {parseFloat(item.priceMin || item.price).toFixed(2)}
                            </span>
                            {item.priceDiscountRate > 0 && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', backgroundColor: '#fee2e2', padding: '2px 5px', borderRadius: '4px' }}>
                                -{item.priceDiscountRate}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Badges / Metrics */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px solid #f0f0f0', fontSize: '0.75rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', gap: '8px', color: '#555' }}>
                          {item.sales > 0 && <span>🔥 {item.sales.toLocaleString('pt-BR')} vendas</span>}
                          {item.ratingStar && <span>⭐ {item.ratingStar}</span>}
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: 900 }}>
                          <Percent size={12} /> {commPercent}% comissão
                        </div>
                      </div>

                      {/* Status Bottom */}
                      <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isImported ? (
                          <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} color="#10b981" /> Já Cadastrado
                          </span>
                        ) : (
                          <span style={{ color: isSelected ? '#FF6600' : '#888', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            {isSelected ? "Selecionado" : "Clique para selecionar"}
                          </span>
                        )}

                        <a
                          href={item.offerLink || item.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                          Ver na Shopee <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANUAL / LEGACY IMPORTER */}
      {activeTab === "manual" && (
        <div className="grid" style={{ gridTemplateColumns: '1.1fr 1.3fr', gap: '2.5rem' }}>
          {/* Left Column: Input and Main Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
            <div className="glass shadow-premium" style={{ padding: '2rem', borderRadius: '28px', background: '#fff' }}>
              <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '1.2rem' }}>
                 <Copy size={22} color="#FF6600" /> Cole o JSON do Robô Extrator
              </h3>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Cole aqui o JSON gerado pelo robô extrator..."
                style={{ width: '100%', height: '240px', padding: '1.2rem', borderRadius: '18px', border: '2px solid #e5e7eb', background: '#fafafa', resize: 'none', color: '#000', fontWeight: 600, fontSize: '0.9rem' }}
              />
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '1.2rem' }}>
                <button 
                  onClick={handleParse}
                  className="btn btn-primary" 
                  style={{ flex: 1, borderRadius: '16px', padding: '1.1rem', fontSize: '1.05rem', fontWeight: 800, gap: '8px' }}
                >
                  Carregar Produtos na Fila <Zap size={20} fill="white" />
                </button>
              </div>
            </div>

            {/* MASTER EXPORT BUTTON */}
            {parsedProducts.length > 0 && (
              <div className="glass shadow-premium" style={{ 
                padding: '1.8rem', 
                borderRadius: '28px', 
                background: '#f0fdf4', 
                border: '3px solid #10b981',
                boxShadow: '0 12px 30px rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#047857', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Ação Final
                  </span>
                  <h3 style={{ margin: '4px 0 8px', fontSize: '1.35rem', fontWeight: 900, color: '#065f46' }}>
                    Pronto para enviar ao site?
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857', fontWeight: 600 }}>
                    Destino: <strong>{currentCatObj?.name || selectedCategory}</strong>.
                  </p>
                </div>

                <button 
                  onClick={handleSaveAllManual}
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    backgroundColor: '#10b981', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '18px', 
                    padding: '1.3rem', 
                    fontSize: '1.2rem', 
                    fontWeight: 900, 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {loading ? 'Salvando...' : `🚀 PUBLICAR TODOS OS ${parsedProducts.length} PRODUTOS`}
                  <CheckCircle2 size={24} />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Preview of Loaded Products */}
          <div>
            <div className="glass shadow-premium" style={{ padding: '2rem', borderRadius: '28px', background: '#fff', minHeight: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
                <div>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '1.3rem' }}>
                    <Package size={24} color="#FF6600" /> Produtos na Fila ({parsedProducts.length})
                  </h3>
                </div>

                {parsedProducts.length > 0 && (
                  <button 
                    onClick={handleSaveAllManual}
                    disabled={loading}
                    style={{ 
                      padding: '0.75rem 1.4rem', 
                      borderRadius: '14px', 
                      backgroundColor: '#10b981', 
                      color: '#fff', 
                      border: 'none', 
                      fontWeight: 900, 
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {loading ? 'Salvando...' : 'Exportar Tudo'} <ArrowRight size={18} />
                  </button>
                )}
              </div>

              {parsedProducts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '420px', opacity: 0.5, textAlign: 'center' }}>
                  <Package size={50} style={{ marginBottom: '1rem', color: '#ccc' }} />
                  <h4 style={{ margin: '0 0 6px', fontWeight: 800 }}>Nenhum produto carregado ainda</h4>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '550px', overflowY: 'auto' }}>
                  {parsedProducts.map((p, idx) => (
                    <div key={p.id || idx} style={{ padding: '0.8rem 1rem', borderRadius: '14px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={p.imageUrl} style={{ width: '45px', height: '45px', borderRadius: '10px', objectFit: 'cover' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#FF6600' }}>R$ {p.price?.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
