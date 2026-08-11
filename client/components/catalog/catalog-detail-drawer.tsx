'use client';

import { X } from 'lucide-react';
import { ProductItem } from './catalog-types';
import { CatalogPerformanceCard } from './subcomponents/catalog-performance-card';
import { CatalogLiveVerificationCard } from './subcomponents/catalog-live-verification-card';
import { CatalogAgentActivityTimeline } from './subcomponents/catalog-agent-activity-timeline';

interface CatalogDetailDrawerProps {
  product: ProductItem;
  onClose: () => void;
}

export function CatalogDetailDrawer({ product, onClose }: CatalogDetailDrawerProps) {
  const prod = product;

  return (
    <aside
      className="w-[360px] shrink-0 rounded-2xl border flex flex-col h-full overflow-hidden backdrop-blur-xl hidden xl:flex"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Header */}
      <div
        className="p-4 border-b flex justify-between items-start shrink-0"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <div>
          <h3 className="font-bold text-base text-foreground leading-tight">{prod.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{prod.category}</span>
            <span>•</span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--ora-success)' }}>
              Active
            </span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-[var(--surface-high)]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Product Overview Card */}
        <div className="flex gap-3.5 items-center">
          <img
            src={prod.image}
            alt={prod.name}
            className="w-20 h-20 rounded-xl object-cover border shrink-0"
            style={{ borderColor: 'var(--glass-border)' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-lg font-bold font-mono" style={{ color: 'var(--primary)' }}>
                {prod.price}
              </span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                {prod.brand}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">SKU: {prod.sku}</p>
          </div>
        </div>

        <div className="h-px w-full" style={{ background: 'var(--glass-border)' }} />

        {/* ORA Performance Metrics */}
        <CatalogPerformanceCard performance={prod.performance} />

        {/* Live Verification & Embeddings */}
        <CatalogLiveVerificationCard
          price={prod.price}
          inventoryCount={prod.inventoryCount}
          embeddings={prod.embeddings}
        />

        {/* Recent Agent Activity */}
        <CatalogAgentActivityTimeline activity={prod.recentActivity} />
      </div>
    </aside>
  );
}
