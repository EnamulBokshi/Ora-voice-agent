'use client';

import { X, Package, ShieldCheck, Zap, Radio, Sparkles, Tag, Layers, RefreshCw } from 'lucide-react';
import { ProductDocument, ProductAvailability, SourceTier } from '@/types/product';

interface ProductDetailDrawerProps {
  product: ProductDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOverride?: (product: ProductDocument) => void;
}

const AVAILABILITY_CONFIG: Record<
  ProductAvailability,
  { label: string; bg: string; text: string; dot: string }
> = {
  [ProductAvailability.IN_STOCK]: {
    label: 'In Stock',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  [ProductAvailability.OUT_OF_STOCK]: {
    label: 'Out of Stock',
    bg: 'bg-rose-500/10 border-rose-500/20',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
  },
  [ProductAvailability.PREORDER]: {
    label: 'Pre-Order',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  [ProductAvailability.DISCONTINUED]: {
    label: 'Discontinued',
    bg: 'bg-zinc-500/10 border-zinc-500/20',
    text: 'text-zinc-400',
    dot: 'bg-zinc-400',
  },
};

const SOURCE_TIER_CONFIG: Record<SourceTier, { label: string; desc: string }> = {
  [SourceTier.TIER1_CONNECTOR]: {
    label: 'Tier 1 Connector',
    desc: 'Shopify / WooCommerce Live Webhook Sync',
  },
  [SourceTier.TIER2_FEED]: {
    label: 'Tier 2 Feed',
    desc: 'Google Merchant XML / RSS / CSV Feed URL',
  },
  [SourceTier.TIER3_PASSIVE]: {
    label: 'Tier 3 Passive',
    desc: 'Storefront Passive Capture / Sitemap Crawler',
  },
  [SourceTier.TIER4_MANUAL]: {
    label: 'Tier 4 Manual',
    desc: 'Merchant File Upload / Manual Admin Override',
  },
};

export function ProductDetailDrawer({
  product,
  isOpen,
  onClose,
  onOpenOverride,
}: ProductDetailDrawerProps) {
  if (!isOpen || !product) return null;

  const avail =
    AVAILABILITY_CONFIG[product.availability] ||
    AVAILABILITY_CONFIG[ProductAvailability.IN_STOCK];
  const tierInfo =
    SOURCE_TIER_CONFIG[product.sourceTier] ||
    SOURCE_TIER_CONFIG[SourceTier.TIER4_MANUAL];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-border bg-surface-container shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-low px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground truncate max-w-xs">
                Product Details
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                SKU: {product.nativeProductId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close product detail drawer"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Main Title & Price */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${avail.bg} ${avail.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
                {avail.label}
              </span>
              <span className="rounded-md border border-border bg-surface-low px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {product.category || 'General'}
              </span>
            </div>

            <h3 className="text-base font-bold text-foreground leading-snug">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground font-mono">
                {product.currency} {product.price.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({product.stockQuantity} units available)
              </span>
            </div>
          </div>

          {/* AI Sales Signals */}
          <div className="rounded-xl border border-border bg-surface-low p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              ORA AI Sales Performance
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-surface-lowest p-3">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  Recommended
                </span>
                <p className="text-lg font-bold text-foreground mt-0.5 font-mono">
                  {product.timesRecommendedByAgent ?? 0}
                </p>
                <span className="text-[10px] text-muted-foreground">times in live chat</span>
              </div>

              <div className="rounded-lg border border-border bg-surface-lowest p-3">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  Upsold
                </span>
                <p className="text-lg font-bold text-foreground mt-0.5 font-mono">
                  {product.timesUpsold ?? 0}
                </p>
                <span className="text-[10px] text-muted-foreground">cross-sell conversions</span>
              </div>
            </div>
          </div>

          {/* Ingestion & Source Tier Info */}
          <div className="rounded-xl border border-border bg-surface-low p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers size={14} className="text-primary" />
              Ingestion Source & Vector Status
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Source Tier</span>
                <span className="font-semibold text-foreground font-mono">
                  {tierInfo.label}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Confidence Score</span>
                <span className="font-mono text-primary font-bold">
                  {(product.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Vector Store Indexed</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck size={13} />
                  Embedded for RAG
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Last Verified</span>
                <span className="text-muted-foreground font-mono">
                  {product.lastVerifiedAt
                    ? new Date(product.lastVerifiedAt).toLocaleString()
                    : 'Recently'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground">
                Description & Specs
              </h4>
              <div className="rounded-xl border border-border bg-surface-low p-3.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            </div>
          )}

          {/* Custom Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag size={13} className="text-primary" />
                Custom Attributes & Variants
              </h4>
              <div className="rounded-xl border border-border bg-surface-low p-3.5 space-y-1.5">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="text-foreground font-semibold">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border bg-surface-low px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-surface-high px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-bright"
          >
            Close
          </button>

          {onOpenOverride && (
            <button
              onClick={() => {
                onClose();
                onOpenOverride(product);
              }}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <RefreshCw size={13} />
              Manual Override
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
