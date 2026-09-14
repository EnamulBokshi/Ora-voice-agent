'use client';

import { X, Package, Layers, RefreshCw } from 'lucide-react';
import { ProductDocument, ProductAvailability, SourceTier } from '@/types/product';

interface ProductDetailDrawerProps {
  product: ProductDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOverride?: (product: ProductDocument) => void;
}

const AVAILABILITY_CONFIG: Record<
  ProductAvailability,
  { label: string; dot: string; text: string }
> = {
  [ProductAvailability.IN_STOCK]: {
    label: 'In Stock',
    dot: 'bg-emerald-400',
    text: 'text-foreground',
  },
  [ProductAvailability.OUT_OF_STOCK]: {
    label: 'Out of Stock',
    dot: 'bg-rose-400',
    text: 'text-muted-foreground',
  },
  [ProductAvailability.PREORDER]: {
    label: 'Pre-Order',
    dot: 'bg-amber-400',
    text: 'text-foreground',
  },
  [ProductAvailability.DISCONTINUED]: {
    label: 'Discontinued',
    dot: 'bg-zinc-500',
    text: 'text-muted-foreground',
  },
};

const SOURCE_TIER_CONFIG: Record<SourceTier, { label: string; desc: string }> = {
  [SourceTier.TIER1_CONNECTOR]: {
    label: 'Live Webhook',
    desc: 'Shopify / WooCommerce sync',
  },
  [SourceTier.TIER2_FEED]: {
    label: 'Catalog Feed',
    desc: 'XML / RSS / CSV feed URL',
  },
  [SourceTier.TIER3_PASSIVE]: {
    label: 'Website Crawl',
    desc: 'Storefront capture',
  },
  [SourceTier.TIER4_MANUAL]: {
    label: 'Manual Entry',
    desc: 'CSV upload or manual edit',
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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface-lowest shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight truncate">
              Product Details
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              SKU: {product.nativeProductId}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Main Info */}
          <div className="space-y-2 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
              <span className={`text-[12px] font-medium ${avail.text}`}>{avail.label}</span>
              <span className="text-border">·</span>
              <span className="text-[12px] text-muted-foreground">{product.category || 'General'}</span>
            </div>

            <h3 className="text-[15px] font-semibold text-foreground leading-snug">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-xl font-bold text-foreground font-mono">
                {product.currency} {product.price.toFixed(2)}
              </span>
              <span className="text-[12px] text-muted-foreground">
                ({product.stockQuantity} in stock)
              </span>
            </div>
          </div>

          {/* Activity / Performance */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Sales Activity
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-surface-high/50 border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Recommended</span>
                <p className="text-base font-semibold text-foreground mt-0.5 font-mono">
                  {product.timesRecommendedByAgent ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-md bg-surface-high/50 border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Upsold</span>
                <p className="text-base font-semibold text-foreground mt-0.5 font-mono">
                  {product.timesUpsold ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Source & Metadata */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Source & Sync
            </h4>
            <div className="space-y-2 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium text-foreground">{tierInfo.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sync status</span>
                <span className="font-medium text-foreground">
                  {product.isEmbedded ? 'Indexed' : 'Standard'}
                </span>
              </div>
              {product.lastVerifiedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last verified</span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {new Date(product.lastVerifiedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Description
              </h4>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          {/* Custom Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                Attributes
              </h4>
              <div className="space-y-1.5 text-[12px]">
                {Object.entries(product.attributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between font-mono"
                  >
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="text-foreground">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>

          {onOpenOverride && (
            <button
              onClick={() => {
                onClose();
                onOpenOverride(product);
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-border bg-surface-container hover:bg-surface-high text-foreground transition-colors"
            >
              <RefreshCw size={12} />
              <span>Edit Product</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
