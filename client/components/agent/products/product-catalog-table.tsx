'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Edit3,
  UploadCloud,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Globe,
  FileSpreadsheet,
  Package,
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
} from '@/types/product';
import { demoProducts } from '@/lib/demo-data';
import { withDemoFallback } from '@/lib/demo-config';
import { ProductOverrideModal } from './product-override-modal';
import { ProductDetailDrawer } from './product-detail-drawer';
import { ProductUploadModal, IngestionTab } from './product-upload-modal';

const AVAILABILITY_STATUS: Record<
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

const SOURCE_LABELS: Record<SourceTier, string> = {
  [SourceTier.TIER1_CONNECTOR]: 'Webhook',
  [SourceTier.TIER2_FEED]: 'Feed',
  [SourceTier.TIER3_PASSIVE]: 'Website Crawl',
  [SourceTier.TIER4_MANUAL]: 'Manual / CSV',
};

interface ProductCatalogTableProps {
  onFed?: () => void;
}

export function ProductCatalogTable({ onFed }: ProductCatalogTableProps = {}) {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState<IngestionTab>('website');
  const [overrideProduct, setOverrideProduct] = useState<ProductDocument | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProductDocument | null>(null);

  // Live Verification tracking
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      const items = withDemoFallback(res.items, demoProducts);
      setProducts(items || []);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total || items.length,
          totalPages: res.pagination.totalPages || 1,
        }));
      } else {
        setPagination((prev) => ({ ...prev, total: items.length, totalPages: 1 }));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      const fallback = withDemoFallback(null, demoProducts);
      setProducts(fallback);
      setPagination((prev) => ({ ...prev, total: fallback.length, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, selectedCategory, selectedAvailability]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleVerifyLive = async (product: ProductDocument) => {
    setVerifyingId(product._id);
    try {
      const verified = await verifyLiveProductApi(product._id);
      setProducts((current) =>
        current.map((p) => (p._id === product._id ? { ...p, ...verified } : p)),
      );
    } catch (err) {
      console.error('Failed live verification:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteProduct = async (product: ProductDocument) => {
    if (!window.confirm(`Remove "${product.name}" from catalog?`)) {
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

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const availabilityTabs = [
    { id: 'all', label: 'All Products' },
    { id: ProductAvailability.IN_STOCK, label: 'In Stock' },
    { id: ProductAvailability.OUT_OF_STOCK, label: 'Out of Stock' },
    { id: ProductAvailability.PREORDER, label: 'Pre-Order' },
  ];

  return (
    <>
      <div className="space-y-4">
        {/* ── Top Bar: Filter Tabs & Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-0">
          {/* Availability filter tabs — Intercom style underline */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
            {availabilityTabs.map((tab) => {
              const isActive = selectedAvailability === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedAvailability(tab.id);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={`relative px-3 py-2 text-[13px] font-medium transition-colors shrink-0 ${
                    isActive
                      ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-2 sm:pb-0 shrink-0">
            <button
              onClick={() => {
                setUploadInitialTab('website');
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <Globe size={13} />
              <span>Sync Website</span>
            </button>

            <button
              onClick={() => {
                setUploadInitialTab('file');
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-border bg-surface-container hover:bg-surface-high text-foreground transition-colors"
            >
              <UploadCloud size={13} />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>

        {/* ── Search & Secondary Filters Toolbar ── */}
        <div className="flex items-center justify-between gap-3 py-1 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search products by SKU or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full rounded-md border border-border bg-transparent pl-8 pr-3 py-1.5 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[12px] text-foreground focus:border-foreground/30 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={loadProducts}
              title="Refresh products"
              aria-label="Refresh catalog"
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Flat Intercom-style Table (No outer box container) ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                <th className="py-2.5 px-3 font-medium">Product</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">Price</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Source</th>
                <th className="py-2.5 px-3 font-medium">Recommendations</th>
                <th className="py-2.5 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                      <span className="text-[12px]">Loading catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto py-6">
                      <Package size={22} className="text-muted-foreground/30 mb-1" />
                      <p className="font-semibold text-foreground text-[13px]">No products found</p>
                      <p className="text-[12px] text-muted-foreground">
                        {searchQuery || selectedCategory !== 'all' || selectedAvailability !== 'all'
                          ? 'No products matched your search or filters.'
                          : 'Import products from your storefront URL or upload a CSV file.'}
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => { setUploadInitialTab('website'); setIsUploadModalOpen(true); }}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
                        >
                          <Globe size={12} />
                          <span>Sync Website</span>
                        </button>
                        <button
                          onClick={() => { setUploadInitialTab('file'); setIsUploadModalOpen(true); }}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-border bg-surface-container hover:bg-surface-high text-foreground transition-colors"
                        >
                          <FileSpreadsheet size={12} />
                          <span>Upload CSV</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const status =
                    AVAILABILITY_STATUS[prod.availability] ||
                    AVAILABILITY_STATUS[ProductAvailability.IN_STOCK];
                  const source =
                    SOURCE_LABELS[prod.sourceTier] || 'Manual';

                  return (
                    <tr
                      key={prod._id}
                      className="group hover:bg-surface-high/40 transition-colors"
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-3">
                        <div className="min-w-[200px]">
                          <button
                            onClick={() => setDetailProduct(prod)}
                            className="text-left font-medium text-foreground hover:underline truncate max-w-[260px] block"
                          >
                            {prod.name}
                          </button>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {prod.nativeProductId}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-muted-foreground text-[12px]">
                        {prod.category || 'General'}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-mono font-medium text-foreground tabular-nums">
                        {prod.currency} {prod.price.toFixed(2)}
                      </td>

                      {/* Stock & Status — subtle clean dot + label */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-[12px]">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                          <span className={status.text}>
                            {status.label}
                            {prod.stockQuantity !== undefined && (
                              <span className="text-muted-foreground font-mono ml-1 text-[11px]">
                                ({prod.stockQuantity})
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-3 text-[12px] text-muted-foreground">
                        {source}
                      </td>

                      {/* Recommendations / Activity */}
                      <td className="py-3 px-3 font-mono text-[12px] text-muted-foreground">
                        <span>
                          {prod.timesRecommendedByAgent ?? 0}
                          <span className="text-muted-foreground/40 mx-1">/</span>
                          {prod.timesUpsold ?? 0}
                        </span>
                      </td>

                      {/* Actions — hidden until row hover (Intercom pattern) */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Details View */}
                          <button
                            onClick={() => setDetailProduct(prod)}
                            title="View details"
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Manual Override */}
                          <button
                            onClick={() => setOverrideProduct(prod)}
                            title="Edit product"
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Delete SKU */}
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            disabled={deletingId === prod._id}
                            title="Delete product"
                            className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
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

        {/* ── Flat Pagination Footer (No box) ── */}
        <div className="flex items-center justify-between border-t border-border pt-3 text-[12px] text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground">{products.length}</span> of{' '}
            <span className="font-medium text-foreground">{pagination.total}</span> products
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(p.page - 1, 1) }))}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 h-7 px-2.5 rounded text-[12px] text-foreground hover:bg-surface-high transition-colors disabled:opacity-40"
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <span className="font-mono text-[11px] text-muted-foreground px-1">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.min(p.page + 1, p.totalPages) }))
              }
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 h-7 px-2.5 rounded text-[12px] text-foreground hover:bg-surface-high transition-colors disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals & Drawers */}
      <ProductUploadModal
        isOpen={isUploadModalOpen}
        initialTab={uploadInitialTab}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          loadProducts();
          onFed?.();
        }}
      />

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

      <ProductDetailDrawer
        product={detailProduct}
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        onOpenOverride={(p) => setOverrideProduct(p)}
      />
    </>
  );
}
