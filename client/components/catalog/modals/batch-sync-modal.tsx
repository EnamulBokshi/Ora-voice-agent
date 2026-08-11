'use client';

import { useState } from 'react';
import { X, RefreshCw, Loader2, Code2 } from 'lucide-react';
import { SourceTier } from '@/types/product';
import { batchSyncProductsApi } from '@/services/products-service';

interface BatchSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynced: () => void;
}

const DEFAULT_JSON = JSON.stringify(
  [
    {
      nativeProductId: 'PROD-201',
      name: 'Smart ANC Earbuds Ultra',
      description: 'Active noise cancellation with 30-hour battery life.',
      price: 149.99,
      currency: 'USD',
      availability: 'in_stock',
      stockQuantity: 50,
      category: 'Electronics',
      sourceTier: 'tier2_feed',
    },
    {
      nativeProductId: 'PROD-202',
      name: 'Ergonomic Mechanical Keyboard',
      description: 'Custom hot-swappable RGB wireless keyboard.',
      price: 189.50,
      currency: 'USD',
      availability: 'in_stock',
      stockQuantity: 30,
      category: 'Peripherals',
      sourceTier: 'tier2_feed',
    },
  ],
  null,
  2,
);

export function BatchSyncModal({ isOpen, onClose, onSynced }: BatchSyncModalProps) {
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON);
  const [sourceTier, setSourceTier] = useState<SourceTier>(SourceTier.TIER2_FEED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    try {
      const parsedProducts = JSON.parse(jsonInput);
      if (!Array.isArray(parsedProducts)) {
        throw new Error('JSON input must be an array of product objects.');
      }

      setLoading(true);
      const response = await batchSyncProductsApi({
        products: parsedProducts,
        sourceTier,
      });

      setResult(`Batch sync complete! Upserted: ${response.upsertedCount}, Modified: ${response.modifiedCount}, Matched: ${response.matchedCount}`);
      setTimeout(() => {
        onSynced();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format or batch sync request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl rounded-2xl border p-6 flex flex-col gap-5 shadow-2xl overflow-hidden"
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
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Batch Product Feed Sync
              </h3>
              <p className="text-xs text-muted-foreground">Bulk upsert products from e-commerce feeds or platform webhooks</p>
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

        {result && (
          <div className="p-3 rounded-xl border text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
            {result}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Code2 size={14} /> Product Array JSON Payload
            </label>
            <textarea
              rows={10}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl p-3 text-xs text-foreground font-mono focus:outline-none focus:border-[var(--primary)] transition-colors resize-none leading-relaxed"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Source Connector Tier</label>
            <select
              value={sourceTier}
              onChange={(e) => setSourceTier(e.target.value as SourceTier)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <option value={SourceTier.TIER1_CONNECTOR}>Tier 1 Direct Connector (Shopify / WooCommerce)</option>
              <option value={SourceTier.TIER2_FEED}>Tier 2 Feed Webhook</option>
              <option value={SourceTier.TIER3_PASSIVE}>Tier 3 Passive Store Crawl</option>
              <option value={SourceTier.TIER4_MANUAL}>Tier 4 Manual Import</option>
            </select>
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
                  <Loader2 size={14} className="animate-spin" /> Processing Batch...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Execute Batch Sync
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
