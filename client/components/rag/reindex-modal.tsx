'use client';

import { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Layers, Package } from 'lucide-react';
import { reindexTenantApi } from '@/services/rag-service';
import { ReindexTenantResponse } from '@/types/rag';

interface ReindexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReindexModal({ isOpen, onClose, onSuccess }: ReindexModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReindexTenantResponse | null>(null);

  if (!isOpen) return null;

  const handleStartReindex = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await reindexTenantApi();
      setResult(response);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed AI sync:', err);
      setError(err.message || 'Failed to complete store knowledge synchronization.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-lg border p-6 lg:p-8 shadow-2xl overflow-hidden flex flex-col gap-6"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Modal Title & Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                color: 'var(--primary)',
              }}
            >
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Sync AI Knowledge & Catalog Index
              </h2>
              <p className="text-xs text-muted-foreground">
                Refresh AI search memory for products and store policies
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        {error && (
          <div className="p-4 rounded-lg border text-xs bg-error/10 border-error/20 text-error flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Sync Error</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {result ? (
          <div
            className="p-5 rounded-lg border flex flex-col gap-4"
            style={{
              background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-low))',
              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
            }}
          >
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 size={16} /> Knowledge Base Sync Completed!
            </div>
            <p className="text-xs text-foreground/90">
              ORA AI search index is updated with your latest catalog products and store rules.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <div
                className="p-3.5 rounded-xl border flex flex-col gap-1"
                style={{
                  background: 'var(--surface-high)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
                  <Package size={13} className="text-[var(--primary)]" /> Products Synced
                </div>
                <span className="text-xl font-extrabold text-foreground">{result.indexedProducts}</span>
              </div>

              <div
                className="p-3.5 rounded-xl border flex flex-col gap-1"
                style={{
                  background: 'var(--surface-high)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
                  <Layers size={13} className="text-[var(--secondary)]" /> Policy Docs Synced
                </div>
                <span className="text-xl font-extrabold text-foreground">{result.indexedChunks}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-xs text-muted-foreground">
            <p className="leading-relaxed">
              This process scans active products in your store catalog and uploaded policy documents to update ORA AI&apos;s search memory.
            </p>
            <div
              className="p-3.5 rounded-xl border flex items-center gap-3 text-foreground/90"
              style={{
                background: 'var(--surface-high)',
                borderColor: 'var(--border)',
              }}
            >
              <Sparkles size={16} className="text-[var(--primary)] shrink-0" />
              <span>Updating your store index ensures ORA voice and chat assistants answer customer questions accurately in real-time.</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleStartReindex}
              disabled={loading}
              className="px-5 py-2.5 rounded-md text-xs font-semibold text-primary-foreground flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
              style={{
                background: 'var(--primary)',
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Syncing Store Knowledge...
                </>
              ) : (
                <>
                  <RefreshCw size={15} /> Sync Store Knowledge
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
