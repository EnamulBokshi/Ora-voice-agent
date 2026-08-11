'use client';

import { useState } from 'react';
import { BookPlus, X, Loader2 } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';
import { KnowledgeItem, mapKnowledgeDocToItem } from '../agent-types';

interface AddKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (newItem: KnowledgeItem) => void;
}

export function AddKnowledgeModal({
  isOpen,
  onClose,
  onAdded,
}: AddKnowledgeModalProps) {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>(DocType.POLICY);
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Document title and content are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await createKnowledgeDocApi({
        title: title.trim(),
        docType,
        content: content.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
      });

      const newItem = mapKnowledgeDocToItem(result.document, []);
      onAdded(newItem);
      handleReset();
      onClose();
    } catch (err: any) {
      console.error('Failed to create knowledge doc:', err);
      setError(err.message || 'Failed to create knowledge document.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDocType(DocType.POLICY);
    setContent('');
    setSourceUrl('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl overflow-hidden flex flex-col gap-5"
        style={{
          background: 'var(--surface-container-high)',
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
              <BookPlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Add Knowledge Item
              </h3>
              <p className="text-xs text-muted-foreground">Add store policies or FAQs for ORA AI to reference.</p>
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
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Document Title / Subject *</label>
            <input
              type="text"
              required
              placeholder="e.g. Express Delivery & Shipping Terms 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Document Type *</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <option value={DocType.POLICY}>Store Policy</option>
              <option value={DocType.FAQ}>FAQ</option>
              <option value={DocType.BRAND_RULE}>Brand Rule / Guideline</option>
              <option value={DocType.SALES_PLAYBOOK}>Sales Playbook</option>
              <option value={DocType.PRODUCT_MANUAL}>Product Manual</option>
              <option value={DocType.UPLOADED_DOC}>Uploaded Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Full Policy Content / Text *</label>
            <textarea
              rows={6}
              required
              placeholder="Enter full store policy details, return rules, delivery rates, or sales guidance..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2.5 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors resize-none leading-relaxed"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Reference Source URL (Optional)</label>
            <input
              type="url"
              placeholder="https://yourstore.com/pages/shipping-policy"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
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
                  <Loader2 size={14} className="animate-spin" /> Indexing Policy Content...
                </>
              ) : (
                <>
                  <BookPlus size={14} /> Save to Knowledge Base
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
