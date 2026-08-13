'use client';

import { useState, useEffect } from 'react';
import { Edit3, X, Loader2 } from 'lucide-react';
import { updateKnowledgeDocApi } from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';
import { KnowledgeItem, mapKnowledgeDocToItem } from '../agent-types';

interface EditKnowledgeModalProps {
  isOpen: boolean;
  item: KnowledgeItem | null;
  onClose: () => void;
  onSaved: (updatedItem: KnowledgeItem) => void;
}

export function EditKnowledgeModal({
  isOpen,
  item,
  onClose,
  onSaved,
}: EditKnowledgeModalProps) {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>(DocType.POLICY);
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDocType(item.docType);
      setContent(item.content);
      setSourceUrl(item.sourceUrl || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Document title and content are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await updateKnowledgeDocApi(item.id, {
        title: title.trim(),
        docType,
        content: content.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
      });

      onSaved(mapKnowledgeDocToItem(result.document, item.chunks));
      onClose();
    } catch (err: any) {
      console.error('Failed to update knowledge doc:', err);
      setError(err.message || 'Failed to update store knowledge document.');
    } finally {
      setLoading(false);
    }
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
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Edit Knowledge Item
              </h3>
              <p className="text-xs text-muted-foreground">Updating content re-syncs the document for AI search automatically.</p>
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
            <label className="block text-xs font-semibold text-foreground mb-1.5">Content / Text *</label>
            <textarea
              rows={6}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2.5 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors resize-none leading-relaxed"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Reference Source URL</label>
            <input
              type="url"
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
                  <Loader2 size={14} className="animate-spin" /> Syncing & Saving...
                </>
              ) : (
                <>
                  <Edit3 size={14} /> Update Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
