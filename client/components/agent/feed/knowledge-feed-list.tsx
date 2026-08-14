'use client';

import { useState, useMemo } from 'react';
import {
  Building2,
  Package,
  ShieldCheck,
  HelpCircle,
  FileText,
  Trash2,
  Loader2,
  Database,
  Layers,
  Edit3,
  Search,
  BookOpen,
} from 'lucide-react';
import { KnowledgeDoc, DocType } from '@/types/knowledge';
import { deleteKnowledgeDocApi } from '@/services/knowledge-service';
import { FEED_CATEGORY_META } from './feed-types';
import { KnowledgeChunkModal } from '../knowledge/knowledge-chunk-modal';
import { KnowledgeEditModal } from '../knowledge/knowledge-edit-modal';

interface KnowledgeFeedListProps {
  docs: KnowledgeDoc[];
  loading: boolean;
  onDeleted: (id: string) => void;
  onRefresh?: () => void;
}

const DOCTYPE_ICONS: Record<string, React.ReactNode> = {
  [DocType.BRAND_RULE]: <Building2 size={14} />,
  [DocType.PRODUCT_MANUAL]: <Package size={14} />,
  [DocType.POLICY]: <ShieldCheck size={14} />,
  [DocType.FAQ]: <HelpCircle size={14} />,
  [DocType.SALES_PLAYBOOK]: <BookOpen size={14} />,
  [DocType.UPLOADED_DOC]: <FileText size={14} />,
};

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: DocType.POLICY, label: 'Policies' },
  { id: DocType.FAQ, label: 'FAQs' },
  { id: DocType.BRAND_RULE, label: 'Brand Rules' },
  { id: DocType.SALES_PLAYBOOK, label: 'Playbooks' },
  { id: DocType.UPLOADED_DOC, label: 'Uploads' },
  { id: DocType.PRODUCT_MANUAL, label: 'Manuals' },
];

export function KnowledgeFeedList({
  docs = [],
  loading,
  onDeleted,
  onRefresh,
}: KnowledgeFeedListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [inspectDoc, setInspectDoc] = useState<KnowledgeDoc | null>(null);
  const [editDoc, setEditDoc] = useState<KnowledgeDoc | null>(null);

  const safeDocs = Array.isArray(docs) ? docs : [];

  const filteredDocs = useMemo(() => {
    return safeDocs.filter((doc) => {
      const matchesCategory =
        selectedCategory === 'all' || doc.docType === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [safeDocs, selectedCategory, searchQuery]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will also remove its vector embeddings.`)) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await deleteKnowledgeDocApi(id);
      onDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete knowledge document.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-surface-container overflow-hidden shadow-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface-low space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Database size={15} className="text-primary" />
              Indexed Knowledge & Documents
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-mono text-primary">
                {safeDocs.length}
              </span>
            </h3>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search indexed knowledge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-lowest pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {CATEGORY_TABS.map((tab) => {
              const count =
                tab.id === 'all'
                  ? safeDocs.length
                  : safeDocs.filter((d) => d.docType === tab.id).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                    selectedCategory === tab.id
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-surface-high text-muted-foreground hover:text-foreground hover:bg-surface-bright'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        selectedCategory === tab.id
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-surface-lowest text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* List Content */}
        <div className="p-4 space-y-2.5 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span className="text-xs">Loading indexed documents...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
              <Database size={24} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">No documents found</p>
              <p>
                {searchQuery || selectedCategory !== 'all'
                  ? 'No documents matched your search or category filter.'
                  : 'Feed ORA guidelines, policies, or FAQs using the left panel.'}
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const meta = FEED_CATEGORY_META[doc.docType] ?? { label: 'Document' };
              const icon = DOCTYPE_ICONS[doc.docType] ?? <FileText size={14} />;
              const source = doc.metadata?.source as string | undefined;

              return (
                <div
                  key={doc._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-surface-low hover:bg-surface-high/60 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0 mt-0.5">
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[280px]">
                          {doc.title}
                        </p>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-border bg-surface-high text-muted-foreground">
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {doc.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                        {source === 'voice_feed' && 'Voice Session · '}
                        {source === 'document_upload' && 'Document Upload · '}
                        {source === 'text_feed' && 'Manual Entry · '}
                        {doc.updatedAt
                          ? new Date(doc.updatedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recently'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => setInspectDoc(doc)}
                      title="Inspect Vector Chunks"
                      aria-label="Inspect vector chunks"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-high border border-border text-muted-foreground hover:text-foreground hover:bg-surface-bright transition-colors"
                    >
                      <Layers size={13} className="text-primary" />
                      <span>Chunks</span>
                    </button>

                    <button
                      onClick={() => setEditDoc(doc)}
                      title="Edit Document"
                      aria-label="Edit document"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>

                    <button
                      onClick={() => handleDelete(doc._id, doc.title)}
                      disabled={deletingId === doc._id}
                      title="Delete Document"
                      aria-label={`Delete ${doc.title}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {deletingId === doc._id ? (
                        <Loader2 size={13} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Vector Chunks Inspector Modal */}
      <KnowledgeChunkModal
        doc={inspectDoc}
        isOpen={Boolean(inspectDoc)}
        onClose={() => setInspectDoc(null)}
      />

      {/* Edit Knowledge Document Modal */}
      <KnowledgeEditModal
        doc={editDoc}
        isOpen={Boolean(editDoc)}
        onClose={() => setEditDoc(null)}
        onUpdated={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </>
  );
}
