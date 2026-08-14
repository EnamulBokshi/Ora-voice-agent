'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package,
  Search,
  RefreshCw,
  Edit3,
  Layers,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
  Zap,
  Trash2,
} from 'lucide-react';
import {
  getProductsApi,
  verifyLiveProductApi,
  deleteProductApi,
} from '@/services/products-service';
import {
  ProductDocument,
  ProductAvailability,
  SourceTier,
  ProductsResponseData,
} from '@/types/product';
import { ProductOverrideModal } from './product-override-modal';
import { ProductDetailDrawer } from './product-detail-drawer';
import { ProductUploadModal } from './product-upload-modal';

const AVAILABILITY_BADGES: Record<
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

const SOURCE_TIER_BADGES: Record<SourceTier, { label: string; bg: string; text: string }> = {
  [SourceTier.TIER1_CONNECTOR]: {
    label: 'Tier 1 Webhook',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
  },
  [SourceTier.TIER2_FEED]: {
    label: 'Tier 2 Feed',
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
  },
  [SourceTier.TIER3_PASSIVE]: {
    label: 'Tier 3 Passive',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
  },
  [SourceTier.TIER4_MANUAL]: {
    label: 'Tier 4 Manual',
    bg: 'bg-purple-500/10 border-purple-500/20',
    text: 'text-purple-400',
  },
};

export function ProductCatalogTable() {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [overrideProduct, setOverrideProduct] = useState<ProductDocument | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProductDocument | null>(null);

  // Live Verification tracking: product ID -> verified state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [liveVerifiedMap, setLiveVerifiedMap] = useState<
    Record<string, { isLowStock: boolean; timestamp: number }>
  >({});

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductsApi({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        availability:
          selectedAvailability !== 'all' ? (selectedAvailability as ProductAvailability) : undefined,
      });

      setProducts(res.items || []);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages || 1,
        }));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, selectedCategory, selectedAvailability]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle live verification
  const handleVerifyLive = async (product: ProductDocument) => {
    setVerifyingId(product._id);
    try {
      const verified = await verifyLiveProductApi(product._id);
      setLiveVerifiedMap((prev) => ({
        ...prev,
        [product._id]: {
          isLowStock: verified.isLowStock,
          timestamp: Date.now(),
        },
      }));
      // Update local product state
      setProducts((current) =>
        current.map((p) => (p._id === product._id ? { ...p, ...verified } : p)),
      );
    } catch (err) {
      console.error('Failed live verification:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (product: ProductDocument) => {
    if (!window.confirm(`Are you sure you want to remove "${product.name}" (SKU: ${product.nativeProductId}) from the catalog mirror?`)) {
      return;
    }
    setDeletingId(product._id);
    try {
      await deleteProductApi(product._id);
      setProducts((current) => current.filter((p) => p._id !== product._id));
      setPagination((prev) => ({ ...prev, total: Math.max(prev.total - 1, 0) }));
    } catch (err) {
      console.error('Failed to delete product:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  return (
    <>
      <div className="space-y-4">
        {/* Action & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-low p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2.5 flex-1 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search products by SKU, name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full rounded-lg border border-border bg-surface-lowest pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="rounded-lg border border-border bg-surface-lowest px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Availability Filter */}
            <select
              value={selectedAvailability}
              onChange={(e) => {
                setSelectedAvailability(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="rounded-lg border border-border bg-surface-lowest px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Availability</option>
              <option value={ProductAvailability.IN_STOCK}>In Stock</option>
              <option value={ProductAvailability.OUT_OF_STOCK}>Out of Stock</option>
              <option value={ProductAvailability.PREORDER}>Pre-Order</option>
              <option value={ProductAvailability.DISCONTINUED}>Discontinued</option>
            </select>

            <button
              onClick={loadProducts}
              title="Refresh Catalog"
              aria-label="Refresh catalog"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground border border-border bg-surface-lowest"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Upload / Ingestion CTA */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover shrink-0 shadow-xs"
          >
            <UploadCloud size={14} />
            <span>Ingest Products</span>
          </button>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-border bg-surface-container overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-low text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Stock & Status</th>
                  <th className="py-3 px-3">Source Tier</th>
                  <th className="py-3 px-3">AI Sales</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={20} className="animate-spin text-primary" />
                        <span>Loading product catalog mirror...</span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Package size={28} className="text-muted-foreground/40 mb-1" />
                        <p className="font-semibold text-foreground text-sm">No products in catalog</p>
                        <p className="text-xs">
                          Upload a product file (CSV, XLSX, PDF) or connect a feed to populate ORA's live product catalog.
                        </p>
                        <button
                          onClick={() => setIsUploadModalOpen(true)}
                          className="mt-2 flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-xs"
                        >
                          <UploadCloud size={13} />
                          Ingest Products Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => {
                    const avail =
                      AVAILABILITY_BADGES[prod.availability] ||
                      AVAILABILITY_BADGES[ProductAvailability.IN_STOCK];
                    const tierBadge =
                      SOURCE_TIER_BADGES[prod.sourceTier] ||
                      SOURCE_TIER_BADGES[SourceTier.TIER4_MANUAL];
                    const verifiedInfo = liveVerifiedMap[prod._id];

                    return (
                      <tr
                        key={prod._id}
                        className="transition-colors hover:bg-surface-low/80 group"
                      >
                        {/* Product Name & SKU */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5 min-w-[200px]">
                            <span className="w-8 h-8 rounded-lg bg-surface-high border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
                              <Package size={15} />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate max-w-[220px]">
                                {prod.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-muted-foreground bg-surface-lowest px-1.5 py-0.2 rounded border border-border">
                                  SKU: {prod.nativeProductId}
                                </span>
                                {prod.isEmbedded && (
                                  <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5">
                                    <ShieldCheck size={10} /> Vectorized
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <span className="rounded-md border border-border bg-surface-low px-2 py-0.5 text-[11px] text-muted-foreground">
                            {prod.category || 'General'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-3 font-mono font-semibold text-foreground tabular-nums">
                          {prod.currency} {prod.price.toFixed(2)}
                        </td>

                        {/* Stock & Status */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${avail.bg} ${avail.text}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
                              {avail.label} ({prod.stockQuantity})
                            </span>
                            {verifiedInfo && verifiedInfo.isLowStock && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                                <AlertTriangle size={11} />
                                <span>Low stock signal active</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Source Tier */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium ${tierBadge.bg} ${tierBadge.text}`}
                          >
                            {tierBadge.label}
                          </span>
                        </td>

                        {/* AI Sales Signals */}
                        <td className="py-3.5 px-3 font-mono text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span title="Times recommended by AI voice">
                              🗣️ <strong className="text-foreground">{prod.timesRecommendedByAgent ?? 0}</strong>
                            </span>
                            <span title="Times upsold by AI voice">
                              💰 <strong className="text-foreground">{prod.timesUpsold ?? 0}</strong>
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Live Price/Stock Verify */}
                            <button
                              onClick={() => handleVerifyLive(prod)}
                              disabled={verifyingId === prod._id}
                              title="Verify Live Price & Stock"
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-surface-high border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
                            >
                              {verifyingId === prod._id ? (
                                <Loader2 size={11} className="animate-spin text-primary" />
                              ) : (
                                <Zap size={11} className="text-primary" />
                              )}
                              <span>Verify</span>
                            </button>

                            {/* Details View */}
                            <button
                              onClick={() => setDetailProduct(prod)}
                              title="View Product Details"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                            >
                              <Eye size={13} />
                            </button>

                            {/* Manual Override */}
                            <button
                              onClick={() => setOverrideProduct(prod)}
                              title="Manual Override"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Edit3 size={13} />
                            </button>

                            {/* Delete SKU */}
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              disabled={deletingId === prod._id}
                              title="Delete Product"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            >
                              {deletingId === prod._id ? (
                                <Loader2 size={13} className="animate-spin text-red-400" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between border-t border-border bg-surface-low px-4 py-3 text-xs text-muted-foreground">
            <div>
              Showing <strong className="text-foreground">{products.length}</strong> of{' '}
              <strong className="text-foreground">{pagination.total}</strong> products
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(p.page - 1, 1) }))}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 rounded-md border border-border bg-surface-lowest px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-surface-high disabled:opacity-40"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>
              <span className="font-mono text-[11px] px-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.min(p.page + 1, p.totalPages) }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 rounded-md border border-border bg-surface-lowest px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-surface-high disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Upload / Ingestion Modal */}
      <ProductUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          loadProducts();
          setIsUploadModalOpen(false);
        }}
      />

      {/* Manual Product Override Modal */}
      <ProductOverrideModal
        product={overrideProduct}
        isOpen={Boolean(overrideProduct)}
        onClose={() => setOverrideProduct(null)}
        onUpdated={(updated) => {
          setProducts((current) =>
            current.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)),
          );
        }}
      />

      {/* Product Details Drawer */}
      <ProductDetailDrawer
        product={detailProduct}
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        onOpenOverride={(p) => setOverrideProduct(p)}
      />
    </>
  );
}
