'use client';

import { useEffect, useState } from 'react';
import { X, Edit3, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { manualOverrideProductApi } from '@/services/products-service';
import { ProductDocument, ProductAvailability } from '@/types/product';

interface ProductOverrideModalProps {
  product: ProductDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedProduct: ProductDocument) => void;
}

export function ProductOverrideModal({
  product,
  isOpen,
  onClose,
  onUpdated,
}: ProductOverrideModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState('USD');
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [availability, setAvailability] = useState<ProductAvailability>(
    ProductAvailability.IN_STOCK,
  );
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price ?? 0);
      setCurrency(product.currency || 'USD');
      setStockQuantity(product.stockQuantity ?? 0);
      setAvailability(product.availability || ProductAvailability.IN_STOCK);
      setCategory(product.category || '');
      setError(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (price < 0) {
      setError('Price cannot be negative.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await manualOverrideProductApi(product._id, {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        currency: currency.trim(),
        stockQuantity: Number(stockQuantity),
        availability,
        category: category.trim() || undefined,
      });

      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to override product details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-surface-container shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-low px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <Edit3 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground truncate max-w-xs">
                  Manual Product Override
                </h2>
                <span className="rounded bg-surface-high border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  SKU: {product.nativeProductId}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Admin correction for price, inventory, stock status, or misparsed fields.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close product override modal"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Product Title / Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Price ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="USD / BDT / EUR"
                className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-mono uppercase text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Availability Status
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ProductAvailability)}
                className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
              >
                <option value={ProductAvailability.IN_STOCK}>In Stock</option>
                <option value={ProductAvailability.OUT_OF_STOCK}>Out of Stock</option>
                <option value={ProductAvailability.PREORDER}>Pre-Order</option>
                <option value={ProductAvailability.DISCONTINUED}>Discontinued</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Apparel, Electronics, Footwear"
              className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Description / Specifications
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Product details, materials, sizing, or warranty..."
              className="w-full rounded-lg border border-border bg-surface-low p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="rounded-lg border border-border bg-surface-low p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <RefreshCw size={12} className="text-primary" />
              Source Tier Notice
            </p>
            <p>
              Saving this manual override will set this record to{' '}
              <strong className="text-primary font-mono">tier4_manual</strong> and immediately invalidate the Redis hot stock cache for live AI voice accuracy.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-surface-high px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-bright"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isSaving && <Loader2 size={13} className="animate-spin" />}
              {isSaving ? 'Saving Override...' : 'Apply Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
