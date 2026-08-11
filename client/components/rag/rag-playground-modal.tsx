'use client';

import { useState } from 'react';
import {
  Sparkles,
  Search,
  SlidersHorizontal,
  Package,
  FileText,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Database,
  Loader2,
} from 'lucide-react';
import {
  searchRagCombinedApi,
  searchRagProductsApi,
  searchRagKnowledgeApi,
} from '@/services/rag-service';
import { SearchResultItem, VectorEntityType } from '@/types/rag';

interface RagPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RagPlaygroundModal({ isOpen, onClose }: RagPlaygroundModalProps) {
  const [searchQuery, setSearchQuery] = useState('delivery fee and return policy');
  const [targetType, setTargetType] = useState<'combined' | 'products' | 'knowledge'>('combined');
  const [limit, setLimit] = useState<number>(5);
  const [threshold, setThreshold] = useState<number>(0.65);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productsResults, setProductsResults] = useState<SearchResultItem[]>([]);
  const [knowledgeResults, setKnowledgeResults] = useState<SearchResultItem[]>([]);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const [executedQuery, setExecutedQuery] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setExecutedQuery(searchQuery);

      if (targetType === 'combined') {
        const res = await searchRagCombinedApi({
          query: searchQuery,
          limit,
          confidenceThreshold: threshold,
        });
        setProductsResults(res.products);
        setKnowledgeResults(res.knowledge);
        setFallbackTriggered(res.fallbackTriggered);
      } else if (targetType === 'products') {
        const res = await searchRagProductsApi({
          query: searchQuery,
          limit,
          confidenceThreshold: threshold,
        });
        setProductsResults(res.results);
        setKnowledgeResults([]);
        setFallbackTriggered(res.fallbackTriggered);
      } else {
        const res = await searchRagKnowledgeApi({
          query: searchQuery,
          limit,
          confidenceThreshold: threshold,
        });
        setProductsResults([]);
        setKnowledgeResults(res.results);
        setFallbackTriggered(false);
      }
    } catch (err: any) {
      console.error('AI Knowledge Search failed:', err);
      setError(err.message || 'Failed to execute search on AI store index.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    'delivery fee inside Dhaka',
    'wireless earbuds warranty',
    'return policy days',
    'smart watch stock price',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          background: 'var(--surface-container-high)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                color: 'var(--primary)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                AI Knowledge & Catalog Search Inspector
              </h2>
              <p className="text-xs text-muted-foreground">
                Preview how ORA AI finds store products and policy answers for customer inquiries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm font-bold p-1.5 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-1">
          {/* Controls Bar */}
          <form onSubmit={handleRunSearch} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type a customer query or keyword..."
                  className="w-full bg-[var(--surface-high)] border rounded-2xl py-3 pl-11 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-all shadow-sm"
                  style={{ borderColor: 'var(--glass-border)' }}
                />
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all shrink-0 disabled:opacity-50"
                style={{
                  background: 'var(--primary)',
                  boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Searching AI Store Index...
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Search AI Index
                  </>
                )}
              </button>
            </div>

            {/* Quick Sample Queries */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground text-[11px] font-semibold">Sample Queries:</span>
              {sampleQueries.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setSearchQuery(sample)}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-medium text-foreground/80 hover:text-foreground hover:bg-[var(--surface-high)] transition-all"
                  style={{
                    background: 'var(--surface-low)',
                    borderColor: 'var(--glass-border)',
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Target Filter & Threshold Sliders */}
            <div
              className="p-4 rounded-2xl border grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"
              style={{
                background: 'var(--surface-low)',
                borderColor: 'var(--glass-border)',
              }}
            >
              {/* Filter Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Database size={12} /> Search Scope
                </label>
                <div className="flex rounded-xl border p-1 bg-[var(--surface-high)]" style={{ borderColor: 'var(--glass-border)' }}>
                  <button
                    type="button"
                    onClick={() => setTargetType('combined')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                      targetType === 'combined' ? 'bg-[var(--primary)] text-white' : 'text-muted-foreground'
                    }`}
                  >
                    All Content
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('products')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                      targetType === 'products' ? 'bg-[var(--primary)] text-white' : 'text-muted-foreground'
                    }`}
                  >
                    Products
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('knowledge')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                      targetType === 'knowledge' ? 'bg-[var(--primary)] text-white' : 'text-muted-foreground'
                    }`}
                  >
                    Policies
                  </button>
                </div>
              </div>

              {/* Confidence Threshold */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <SlidersHorizontal size={12} /> Matching Strictness
                  </label>
                  <span className="font-mono font-bold text-[var(--primary)]">{(threshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg accent-[var(--primary)] cursor-pointer bg-[var(--surface-high)]"
                />
              </div>

              {/* Candidate Cap Limit */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <SlidersHorizontal size={12} /> Max Matches Shown
                  </label>
                  <span className="font-mono font-bold text-foreground">{limit}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg accent-[var(--primary)] cursor-pointer bg-[var(--surface-high)]"
                />
              </div>
            </div>
          </form>

          {error && (
            <div className="p-4 rounded-2xl border text-xs bg-red-500/10 border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          {/* Results Summary & List */}
          {executedQuery && (
            <div className="flex flex-col gap-5">
              {/* Status Header */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b pb-3" style={{ borderColor: 'var(--glass-border)' }}>
                <span className="text-muted-foreground">
                  Query: <strong className="text-foreground font-mono">&quot;{executedQuery}&quot;</strong>
                </span>

                <div className="flex items-center gap-2">
                  {fallbackTriggered && (
                    <span
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold border text-amber-400 flex items-center gap-1"
                      style={{
                        background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)',
                      }}
                    >
                      <AlertTriangle size={12} /> Live Catalog Backup Used
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border-emerald-500/20">
                    <CheckCircle2 size={12} /> Search Completed ({productsResults.length + knowledgeResults.length} matches)
                  </span>
                </div>
              </div>

              {/* Products Match Results */}
              {(targetType === 'combined' || targetType === 'products') && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package size={14} className="text-[var(--primary)]" /> Matching Store Products ({productsResults.length})
                  </h3>

                  {productsResults.length === 0 ? (
                    <div className="p-4 rounded-xl border text-xs text-center text-muted-foreground bg-[var(--surface-low)]" style={{ borderColor: 'var(--glass-border)' }}>
                      No product matches found above strictness threshold ({(threshold * 100).toFixed(0)}%).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {productsResults.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[var(--primary)]"
                          style={{
                            background: 'var(--surface-low)',
                            borderColor: 'var(--glass-border)',
                          }}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-[var(--surface-high)] text-[var(--primary)] border" style={{ borderColor: 'var(--glass-border)' }}>
                              #{idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-foreground truncate">
                                {item.data?.name || item.text}
                              </h4>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                {item.text}
                              </p>
                              {item.data?.price !== undefined && (
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-semibold">
                                  <span className="text-[var(--primary)] font-bold">৳{item.data.price}</span>
                                  <span>•</span>
                                  <span>ID: {item.data.nativeProductId || item.metadata?.nativeProductId}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase border text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/20">
                              Product Item
                            </span>
                            <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                              {(item.score * 100).toFixed(0)}% relevance match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Knowledge Chunks Match Results */}
              {(targetType === 'combined' || targetType === 'knowledge') && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText size={14} className="text-[var(--secondary)]" /> Matching Store Policies ({knowledgeResults.length})
                  </h3>

                  {knowledgeResults.length === 0 ? (
                    <div className="p-4 rounded-xl border text-xs text-center text-muted-foreground bg-[var(--surface-low)]" style={{ borderColor: 'var(--glass-border)' }}>
                      No store policy matched above strictness threshold ({(threshold * 100).toFixed(0)}%).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {knowledgeResults.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[var(--secondary)]"
                          style={{
                            background: 'var(--surface-low)',
                            borderColor: 'var(--glass-border)',
                          }}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-[var(--surface-high)] text-[var(--secondary)] border" style={{ borderColor: 'var(--glass-border)' }}>
                              #{idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-foreground truncate">
                                Policy: {item.metadata?.docTitle || 'Store Policy'}
                              </h4>
                              <p className="text-[11px] text-muted-foreground line-clamp-3 mt-1 leading-relaxed bg-[var(--surface-high)] p-2.5 rounded-xl border" style={{ borderColor: 'var(--glass-border)' }}>
                                &quot;{item.text}&quot;
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider uppercase border text-[var(--secondary)] bg-[var(--secondary)]/10 border-[var(--secondary)]/20">
                              Store Policy
                            </span>
                            <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20">
                              {(item.score * 100).toFixed(0)}% relevance match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
