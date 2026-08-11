'use client';

import { CheckCircle2, AlertTriangle, CloudCheck, ShoppingBag, RefreshCw, Sparkles } from 'lucide-react';
import { ProductItem } from './catalog-types';

interface CatalogMetricsProps {
  products: ProductItem[];
  totalFromPagination?: number;
  onOpenReindex?: () => void;
  onOpenRagPlayground?: () => void;
}

export function CatalogMetrics({
  products,
  totalFromPagination,
  onOpenReindex,
  onOpenRagPlayground,
}: CatalogMetricsProps) {
  const totalIndexed = totalFromPagination ?? products.length;
  const verifiedCount = products.filter((p) => p.oraStatus === 'verified').length;
  const attentionCount = products.filter((p) => p.oraStatus === 'needs_attention').length;
  const coveragePct =
    totalIndexed > 0 && products.length > 0
      ? ((verifiedCount / products.length) * 100).toFixed(1)
      : '100';

  const totalAgentUpsells = products.reduce((acc, p) => acc + p.oraSalesOrders, 0);

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* 4 Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Indexed */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
            Total Indexed
          </span>
          <span className="text-2xl font-bold text-foreground">{totalIndexed}</span>
        </div>

        {/* Verified */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
            Verified
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{verifiedCount}</span>
            <CheckCircle2 size={18} style={{ color: 'var(--ora-success)' }} />
          </div>
        </div>

        {/* Needs Attention */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'color-mix(in srgb, var(--ora-warning) 8%, var(--glass-bg))',
            borderColor: 'color-mix(in srgb, var(--ora-warning) 30%, transparent)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
            Needs Attention
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: 'var(--ora-warning)' }}>
              {attentionCount}
            </span>
            <AlertTriangle size={18} style={{ color: 'var(--ora-warning)' }} />
          </div>
        </div>

        {/* ORA Sales Orders */}
        <div
          className="rounded-2xl p-5 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
            Agent Sales
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--primary)' }}>
              {totalAgentUpsells}
            </span>
            <ShoppingBag size={18} style={{ color: 'var(--primary)' }} />
          </div>
        </div>
      </div>

      {/* Catalog Health & AI Search Index Banner */}
      <div
        className="rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--secondary) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--secondary) 20%, transparent)' }}
          >
            <CloudCheck size={18} style={{ color: 'var(--secondary)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--secondary)' }}>
              Smart AI Product Catalog ({coveragePct}% verified)
            </p>
            <p className="text-xs text-muted-foreground">
              Real-time AI catalog indexing & live product verification active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {onOpenRagPlayground && (
            <button
              onClick={onOpenRagPlayground}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border text-purple-300 transition-all flex items-center gap-1.5 hover:bg-purple-500/10"
              style={{
                background: 'color-mix(in srgb, var(--secondary) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--secondary) 30%, transparent)',
              }}
            >
              <Sparkles size={13} className="text-[var(--secondary)]" /> Test AI Search
            </button>
          )}

          {onOpenReindex && (
            <button
              onClick={onOpenReindex}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border text-foreground transition-all flex items-center gap-1.5 hover:bg-[var(--surface-high)]"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <RefreshCw size={13} className="text-[var(--primary)]" /> Sync AI Index
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
