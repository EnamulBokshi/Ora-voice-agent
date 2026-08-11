'use client';

import { useState } from 'react';
import { X, PackagePlus, Loader2 } from 'lucide-react';
import { ProductAvailability, SourceTier } from '@/types/product';
import { createProductApi } from '@/services/products-service';
import { ProductItem, mapDocToProductItem } from '../catalog-types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (newItem: ProductItem) => void;
}

export function AddProductModal({ isOpen, onClose, onAdded }: AddProductModalProps) {
  const [nativeProductId, setNativeProductId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [availability, setAvailability] = useState<ProductAvailability>(ProductAvailability.IN_STOCK);
  const [stockQuantity, setStockQuantity] = useState<number | ''>(10);
  const [category, setCategory] = useState('Electronics');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceTier, setSourceTier] = useState<SourceTier>(SourceTier.TIER4_MANUAL);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nativeProductId.trim() || !name.trim() || price === '') return;

    try {
      setLoading(true);
      setError(null);

      const createdDoc = await createProductApi({
        nativeProductId,
        name,
        description: description || undefined,
        price: Number(price),
        currency,
        availability,
        stockQuantity: Number(stockQuantity) || 0,
        category: category || undefined,
        images: imageUrl ? [imageUrl] : undefined,
        sourceTier,
      });

      onAdded(mapDocToProductItem(createdDoc));
      onClose();
      // Reset form
      setNativeProductId('');
      setName('');
      setDescription('');
      setPrice('');
      setImageUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 flex flex-col gap-5 shadow-2xl overflow-hidden"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b pb-4" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}
            >
              <PackagePlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Add New Product
              </h3>
              <p className="text-xs text-muted-foreground">Index a product into merchant catalog for ORA AI Sales Agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border text-xs bg-red-500/10 border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">SKU / Product ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. PROD-1092"
                value={nativeProductId}
                onChange={(e) => setNativeProductId(e.target.value)}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors font-mono"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Category *</label>
              <input
                type="text"
                required
                placeholder="e.g. Headphones"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Wireless Noise Canceling Headphones"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
            <textarea
              rows={2}
              placeholder="Product specs, key features, warranty details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Price *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="299.99"
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors font-mono"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                <option value="USD">USD ($)</option>
                <option value="BDT">BDT (৳)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Stock Quantity</label>
              <input
                type="number"
                placeholder="25"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors font-mono"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Availability Status</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ProductAvailability)}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                <option value={ProductAvailability.IN_STOCK}>In Stock</option>
                <option value={ProductAvailability.OUT_OF_STOCK}>Out of Stock</option>
                <option value={ProductAvailability.PREORDER}>Preorder</option>
                <option value={ProductAvailability.DISCONTINUED}>Discontinued</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Source Tier</label>
              <select
                value={sourceTier}
                onChange={(e) => setSourceTier(e.target.value as SourceTier)}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                <option value={SourceTier.TIER1_CONNECTOR}>Tier 1 Connector</option>
                <option value={SourceTier.TIER2_FEED}>Tier 2 Feed</option>
                <option value={SourceTier.TIER3_PASSIVE}>Tier 3 Passive</option>
                <option value={SourceTier.TIER4_MANUAL}>Tier 4 Manual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Product Image URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50"
              style={{
                background: 'var(--logo-gradient)',
                boxShadow: 'var(--logo-glow)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Adding...
                </>
              ) : (
                <>
                  <PackagePlus size={14} /> Save Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
