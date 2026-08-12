'use client';

import { useState } from 'react';
import { X, Zap, Edit3, Trash2, Loader2, Sparkles } from 'lucide-react';
import { ProductItem } from './catalog-types';
import { CatalogPerformanceCard } from './subcomponents/catalog-performance-card';
import { CatalogLiveVerificationCard } from './subcomponents/catalog-live-verification-card';
import { CatalogAgentActivityTimeline } from './subcomponents/catalog-agent-activity-timeline';

interface CatalogDetailDrawerProps {
  product: ProductItem | null;
  onClose: () => void;
  onEdit: (product: ProductItem) => void;
  onDelete: (id: string) => void;
  onVerifyLive: (id: string) => Promise<void>;
}

export function CatalogDetailDrawer({
  product,
  onClose,
  onEdit,
  onDelete,
  onVerifyLive,
}: CatalogDetailDrawerProps) {
  const [verifying, setVerifying] = useState(false);

  if (!product) {
    return null;
  }

  const handleVerify = async () => {
    try {
      setVerifying(true);
      await onVerifyLive(product.id);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <aside
      className="w-[360px] shrink-0 rounded-md border flex flex-col h-full overflow-hidden hidden xl:flex"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex justify-between items-start shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <h3 className="font-bold text-base text-foreground leading-tight">{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{product.category}</span>
            <span>•</span>
            <span
              className="text-[11px] font-medium"
              style={{
                color: product.rawDoc?.isActive ? 'var(--ora-success)' : 'var(--ora-warning)',
              }}
            >
              {product.rawDoc?.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(product)}
            title="Edit Product"
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-[var(--surface-high)]"
          >
            <Edit3 size={15} />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            title="Delete Product"
            className="text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded-full hover:bg-[var(--surface-high)]"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-[var(--surface-high)]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Product Overview Card */}
        <div className="flex gap-3.5 items-center">
          <img
            src={product.image}
            alt={product.name}
            className="w-20 h-20 rounded-md object-cover border shrink-0 bg-background"
            style={{ borderColor: 'var(--border)' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-lg font-bold font-mono" style={{ color: 'var(--primary)' }}>
                {product.price}
              </span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold border uppercase"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                {product.brand}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">SKU: {product.sku}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tier: {product.source}</p>
          </div>
        </div>

        {product.description && (
          <div className="p-3 rounded-md border text-xs text-muted-foreground leading-relaxed" style={{ background: 'var(--surface-container)', borderColor: 'var(--border)' }}>
            <span className="font-semibold text-foreground block mb-1">Description</span>
            {product.description}
          </div>
        )}

        {/* Live Verification Trigger Button */}
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full py-2 px-3 rounded-md text-xs font-semibold border flex items-center justify-center gap-2 transition-all hover:bg-[var(--surface-high)]"
          style={{
            background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
            borderColor: 'var(--primary)',
            color: 'var(--primary)',
          }}
        >
          {verifying ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Verifying Price & Stock...
            </>
          ) : (
            <>
              <Zap size={14} /> Run Live Verification Update
            </>
          )}
        </button>

        <div className="h-px w-full" style={{ background: 'var(--border)' }} />

        {/* ORA Performance Metrics */}
        <CatalogPerformanceCard performance={product.performance} />

        {/* Live Verification & Embeddings */}
        <CatalogLiveVerificationCard
          price={product.price}
          inventoryCount={product.inventoryCount}
          embeddings={product.embeddings}
        />

        {/* Recent Agent Activity */}
        <CatalogAgentActivityTimeline activity={product.recentActivity} />
      </div>
    </aside>
  );
}
