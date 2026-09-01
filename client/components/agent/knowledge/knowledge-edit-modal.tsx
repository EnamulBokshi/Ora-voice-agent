'use client';

import { useEffect, useState } from 'react';
import { X, Edit3, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { updateKnowledgeDocApi } from '@/services/knowledge-service';
import { KnowledgeDoc, DocType } from '@/types/knowledge';

interface KnowledgeEditModalProps {
  doc: KnowledgeDoc | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const DOC_TYPE_OPTIONS = [
  { value: DocType.POLICY, label: 'Store Policy & Rules' },
  { value: DocType.BRAND_RULE, label: 'Brand Guidelines & Tone' },
  { value: DocType.FAQ, label: 'Customer FAQ' },
  { value: DocType.SALES_PLAYBOOK, label: 'Sales Playbook & Pitch' },
  { value: DocType.UPLOADED_DOC, label: 'General Reference Document' },
  { value: DocType.PRODUCT_MANUAL, label: 'Product Manual & Guide' },
];

export function KnowledgeEditModal({ doc, isOpen, onClose, onUpdated }: KnowledgeEditModalProps) {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>(DocType.POLICY);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '');
      setDocType(doc.docType || DocType.POLICY);
      setContent(doc.content || '');
      setError(null);
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await updateKnowledgeDocApi(doc._id, {
        title: title.trim(),
        docType,
        content: content.trim(),
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface-container shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-low px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <Edit3 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Edit Knowledge Document</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Modifications will automatically re-chunk text and update Gemini vector embeddings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close edit document modal"
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
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Return & Exchange Policy 2026"
              className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              {DOC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">
                Document Content
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {content.length} characters
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={9}
              placeholder="Enter full document rules, policy details, guidelines, or FAQ text..."
              className="w-full rounded-lg border border-border bg-surface-low p-3.5 text-xs font-mono leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-[11px] text-muted-foreground">
            <Sparkles size={14} className="text-primary shrink-0" />
            <span>
              Saving will re-index this document into ~500-char chunks for instant AI agent voice & text retrieval.
            </span>
          </div>

          {/* Footer Actions */}
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
              {isSaving ? 'Saving & Re-Indexing...' : 'Save & Re-Index'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
