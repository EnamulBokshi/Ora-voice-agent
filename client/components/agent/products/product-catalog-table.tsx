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
import { useReadOnly } from '@/components/common/read-only-fence';

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
  const readOnly = useReadOnly();
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
    // `POST /products/:id/verify-live` rewrites the stored product.
    if (readOnly) return;

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
    if (readOnly) return;

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
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-4">
        {/* ── Section Header ── */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3.5">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-primary flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
              Product Catalog
            </h2>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {pagination.total} {pagination.total === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* ── Top Bar: Filter Tabs & Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-0">
          {/* Availability filter tabs */}
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
                  className={`relative px-3 py-2 text-[12.5px] font-medium transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
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
              disabled={readOnly}
              title={readOnly ? 'View-only access' : undefined}
              className="flex items-center gap-1.5 h-7.5 px-3 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              <Globe size={12} />
              <span>Sync Website</span>
            </button>

            <button
              onClick={() => {
                setUploadInitialTab('file');
                setIsUploadModalOpen(true);
              }}
              disabled={readOnly}
              title={readOnly ? 'View-only access' : undefined}
              className="flex items-center gap-1.5 h-7.5 px-3 rounded-md text-[12px] font-medium border border-border/60 bg-surface-container/60 hover:bg-surface-high text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <UploadCloud size={12} className="text-muted-foreground" />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>

        {/* ── Search & Secondary Filters Toolbar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
          <div className="flex items-center gap-2 w-full sm:flex-1 sm:max-w-md">
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
                className="w-full rounded-md border border-border/60 bg-surface-high/30 pl-8 pr-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 text-[12px]">
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="rounded-md border border-border/60 bg-surface-high/30 px-2.5 py-1.5 text-[12px] text-foreground focus:border-foreground focus:outline-none cursor-pointer flex-1 sm:flex-initial"
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
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer border border-border/40 shrink-0 touch-manipulation"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Table Container ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                <th className="py-2.5 px-3 font-medium">Product</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">Price</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Source</th>
                <th className="py-2.5 px-3 font-medium">Recommendations</th>
                <th className="py-2.5 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
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
                          disabled={readOnly}
                          title={readOnly ? 'View-only access' : undefined}
                          className="flex items-center gap-1.5 h-7.5 px-3 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                        >
                          <Globe size={12} />
                          <span>Sync Website</span>
                        </button>
                        <button
                          onClick={() => { setUploadInitialTab('file'); setIsUploadModalOpen(true); }}
                          disabled={readOnly}
                          title={readOnly ? 'View-only access' : undefined}
                          className="flex items-center gap-1.5 h-7.5 px-3 rounded-md text-[12px] font-medium border border-border/60 bg-surface-container/60 hover:bg-surface-high text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                      className="group hover:bg-surface-high/30 transition-colors"
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-3">
                        <div className="min-w-[200px]">
                          <button
                            onClick={() => setDetailProduct(prod)}
                            className="text-left font-medium text-foreground hover:underline truncate max-w-[260px] block cursor-pointer"
                          >
                            {prod.name}
                          </button>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {prod.nativeProductId}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-muted-foreground text-[12px]">
                        {prod.category || 'General'}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-medium text-foreground tabular-nums">
                        {prod.currency} {prod.price.toFixed(2)}
                      </td>

                      {/* Stock & Status */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-[12px]">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                          <span className={status.text}>
                            {status.label}
                            {prod.stockQuantity !== undefined && (
                              <span className="text-muted-foreground ml-1 text-[11px] tabular-nums">
                                ({prod.stockQuantity})
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-3 text-[11.5px] text-muted-foreground">
                        {source}
                      </td>

                      {/* Recommendations / Activity */}
                      <td className="py-3 px-3 text-[12px] text-muted-foreground tabular-nums">
                        <span>
                          {prod.timesRecommendedByAgent ?? 0}
                          <span className="text-muted-foreground/40 mx-1">/</span>
                          {prod.timesUpsold ?? 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setDetailProduct(prod)}
                            title="View details"
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            onClick={() => setOverrideProduct(prod)}
                            disabled={readOnly}
                            title={readOnly ? 'View-only access' : 'Edit product'}
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            disabled={readOnly || deletingId === prod._id}
                            title={readOnly ? 'View-only access' : 'Delete product'}
                            className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
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

        {/* ── Pagination Footer ── */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[12px] text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground tabular-nums">{products.length}</span> of{' '}
            <span className="font-medium text-foreground tabular-nums">{pagination.total}</span> products
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(p.page - 1, 1) }))}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] text-foreground hover:bg-surface-high transition-colors disabled:opacity-40 cursor-pointer border border-border/40"
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <span className="text-[11px] text-muted-foreground px-1 tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.min(p.page + 1, p.totalPages) }))
              }
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] text-foreground hover:bg-surface-high transition-colors disabled:opacity-40 cursor-pointer border border-border/40"
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
