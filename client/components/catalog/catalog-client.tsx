'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductItem, mapDocToProductItem } from './catalog-types';
import { CatalogMetrics } from './catalog-metrics';
import { CatalogTable } from './catalog-table';
import { CatalogDetailDrawer } from './catalog-detail-drawer';
import { AddProductModal } from './modals/add-product-modal';
import { EditProductModal } from './modals/edit-product-modal';
import { BatchSyncModal } from './modals/batch-sync-modal';
import { ReindexModal } from '@/components/rag/reindex-modal';
import { RagPlaygroundModal } from '@/components/rag/rag-playground-modal';
import {
  getProductsApi,
  deleteProductApi,
  verifyLiveProductApi,
} from '@/services/products-service';
import { Loader2 } from 'lucide-react';

export function CatalogClient() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [isReindexModalOpen, setIsReindexModalOpen] = useState<boolean>(false);
  const [isRagPlaygroundModalOpen, setIsRagPlaygroundModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getProductsApi({
        search: searchQuery || undefined,
        limit: 50,
      });

      const mapped = response.items.map(mapDocToProductItem);
      setProducts(mapped);
      setTotalCount(response.pagination.total);

      if (mapped.length > 0 && !selectedId) {
        setSelectedId(mapped[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to connect to backend product catalog.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const selectedProduct =
    products.find((p) => p.id === selectedId) || products[0] || null;

  // Handlers
  const handleProductAdded = (newItem: ProductItem) => {
    setProducts((prev) => [newItem, ...prev]);
    setSelectedId(newItem.id);
  };

  const handleProductUpdated = (updatedItem: ProductItem) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product from your store catalog?')) {
      return;
    }

    try {
      await deleteProductApi(id);
      const remaining = products.filter((p) => p.id !== id);
      setProducts(remaining);
      if (selectedId === id && remaining.length > 0) {
        setSelectedId(remaining[0].id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  const handleVerifyLive = async (id: string) => {
    try {
      const updatedDoc = await verifyLiveProductApi(id, {});
      const updatedItem = mapDocToProductItem(updatedDoc);
      handleProductUpdated(updatedItem);
    } catch (err: any) {
      alert(err.message || 'Failed to verify product.');
    }
  };

  return (
    <div className="flex-1 flex gap-6 h-full w-full overflow-hidden p-6 lg:p-8">
      {/* Left Column: Metrics + Table */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Metrics Grid + Health Banner */}
        <CatalogMetrics
          products={products}
          totalFromPagination={totalCount}
          onOpenReindex={() => setIsReindexModalOpen(true)}
          onOpenRagPlayground={() => setIsRagPlaygroundModalOpen(true)}
        />

        {error && (
          <div className="mb-4 p-3 rounded-xl border text-xs bg-red-500/10 border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Product Table with Toolbar */}
        {loading && products.length === 0 ? (
          <div
            className="flex-1 rounded-2xl border p-12 flex flex-col items-center justify-center text-muted-foreground"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
          >
            <Loader2 size={32} className="animate-spin mb-3 text-[var(--primary)]" />
            <p className="text-xs font-semibold">Loading Store Product Catalog...</p>
          </div>
        ) : (
          <CatalogTable
            products={products}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            onAddProduct={() => setIsAddModalOpen(true)}
            onBatchSync={() => setIsBatchModalOpen(true)}
            onEditProduct={(p) => setEditingProduct(p)}
            onDeleteProduct={handleDeleteProduct}
            onVerifyLive={handleVerifyLive}
          />
        )}
      </div>

      {/* Right Column: Product Detail Drawer */}
      <CatalogDetailDrawer
        product={selectedProduct}
        onClose={() => {}}
        onEdit={(p) => setEditingProduct(p)}
        onDelete={handleDeleteProduct}
        onVerifyLive={handleVerifyLive}
      />

      {/* Modals */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={handleProductAdded}
      />

      <EditProductModal
        isOpen={Boolean(editingProduct)}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onUpdated={handleProductUpdated}
      />

      <BatchSyncModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSynced={fetchProducts}
      />

      <ReindexModal
        isOpen={isReindexModalOpen}
        onClose={() => setIsReindexModalOpen(false)}
        onSuccess={fetchProducts}
      />

      <RagPlaygroundModal
        isOpen={isRagPlaygroundModalOpen}
        onClose={() => setIsRagPlaygroundModalOpen(false)}
      />
    </div>
  );
}
