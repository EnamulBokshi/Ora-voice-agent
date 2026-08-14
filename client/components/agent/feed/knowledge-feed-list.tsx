'use client';

import { useState } from 'react';
import { Building2, Package, ShieldCheck, HelpCircle, FileText, Trash2, Loader2, Database } from 'lucide-react';
import { KnowledgeDoc, DocType } from '@/types/knowledge';
import { deleteKnowledgeDocApi } from '@/services/knowledge-service';
import { FEED_CATEGORY_META } from './feed-types';

interface KnowledgeFeedListProps {
  docs: KnowledgeDoc[];
  loading: boolean;
  onDeleted: (id: string) => void;
}

const DOCTYPE_ICONS: Record<string, React.ReactNode> = {
  [DocType.BRAND_RULE]: <Building2 size={15} />,
  [DocType.PRODUCT_MANUAL]: <Package size={15} />,
  [DocType.POLICY]: <ShieldCheck size={15} />,
  [DocType.FAQ]: <HelpCircle size={15} />,
  [DocType.UPLOADED_DOC]: <FileText size={15} />,
};

export function KnowledgeFeedList({ docs = [], loading, onDeleted }: KnowledgeFeedListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const safeDocs = Array.isArray(docs) ? docs : [];

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteKnowledgeDocApi(id);
      onDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete knowledge.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-container overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-surface-low flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Database size={15} className="text-primary" />
          Indexed Knowledge & Documents ({safeDocs.length})
        </h3>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-error/10 border border-error/20 text-xs text-error">
          {error}
        </div>
      )}

      <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : safeDocs.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Nothing yet. Use the tabs above to feed ORA your business info, products, and documents.
          </p>
        ) : (
          safeDocs.map((doc) => {
            const meta = FEED_CATEGORY_META[doc.docType] ?? { label: 'Document' };
            const icon = DOCTYPE_ICONS[doc.docType] ?? <FileText size={15} />;
            const source = doc.metadata?.source as string | undefined;

            return (
              <div
                key={doc._id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-low hover:bg-surface-high transition-colors"
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{doc.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {meta.label}
                    {source === 'voice_feed' && ' · Voice'}
                    {source === 'document_upload' && ' · Upload'}
                    {source === 'text_feed' && ' · Text'}
                    {' · '}
                    {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc._id)}
                  disabled={deletingId === doc._id}
                  aria-label={`Delete ${doc.title}`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-error hover:bg-error/10 transition-colors shrink-0 disabled:opacity-50"
                >
                  {deletingId === doc._id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
