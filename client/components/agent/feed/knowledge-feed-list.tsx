'use client';

import { useState, useMemo } from 'react';
import { useReadOnly } from '@/components/common/read-only-fence';
import {
  FileText,
  Trash2,
  Loader2,
  Database,
  Layers,
  Edit3,
  Search,
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

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: DocType.POLICY, label: 'Policy' },
  { id: DocType.FAQ, label: 'FAQ' },
  { id: DocType.BRAND_RULE, label: 'Brand' },
  { id: DocType.SALES_PLAYBOOK, label: 'Playbook' },
  { id: DocType.UPLOADED_DOC, label: 'Uploads' },
  { id: DocType.PRODUCT_MANUAL, label: 'Manual' },
];

export function KnowledgeFeedList({
  docs = [],
  loading,
  onDeleted,
  onRefresh,
}: KnowledgeFeedListProps) {
  const readOnly = useReadOnly();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!window.confirm(`Delete "${title}"?`)) return;
    setDeletingId(id);
    try {
      await deleteKnowledgeDocApi(id);
      onDeleted(id);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Database size={15} className="text-primary flex-shrink-0" />
          <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
            Knowledge Base
          </h2>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            ({safeDocs.length})
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search docs…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-36 sm:w-44 rounded-md border border-border/60 bg-surface-high/30 pl-7 pr-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* ── Category tabs — text tabs, no pill boxes ── */}
      <div className="flex items-center gap-0 border-b border-border/40 mb-0 overflow-x-auto no-scrollbar">
        {CATEGORY_TABS.map((tab) => {
          const count =
            tab.id === 'all'
              ? safeDocs.length
              : safeDocs.filter((d) => d.docType === tab.id).length;
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`relative px-3 py-2 text-[12px] font-medium transition-colors shrink-0 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10.5px] tabular-nums ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Document list — Intercom-style flat rows ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-[12px]">Loading…</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="py-12 text-center select-none">
          <Database size={20} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-[12.5px] font-medium text-foreground">No documents</p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            {searchQuery || selectedCategory !== 'all'
              ? 'Nothing matched your filter.'
              : 'Upload documents using the form to populate knowledge.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {filteredDocs.map((doc) => {
            const meta = FEED_CATEGORY_META[doc.docType] ?? { label: 'Document' };
            const source = doc.metadata?.source as string | undefined;

            return (
              <div
                key={doc._id}
                className="flex items-center justify-between gap-3 py-3 group hover:bg-surface-high/30 px-2 rounded-md transition-colors"
              >
                {/* Left: icon + info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-6 h-6 rounded-md bg-surface-high/50 border border-border/40 flex items-center justify-center text-muted-foreground flex-shrink-0">
                    <FileText size={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {doc.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {meta.label}
                      {source === 'voice_feed' ? ' · Voice' : source === 'document_upload' ? ' · Upload' : source === 'text_feed' ? ' · Manual' : ''}
                      {doc.updatedAt && (
                        <span className="tabular-nums"> · {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: actions (hidden until hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => setInspectDoc(doc)}
                    title="View chunks"
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
                  >
                    <Layers size={13} />
                  </button>
                  {/* Editing and deleting are `@Roles(OWNER, ADMIN)`. Viewing
                      chunks above is not, so it stays live. */}
                  <button
                    onClick={() => setEditDoc(doc)}
                    disabled={readOnly}
                    title={readOnly ? 'View-only access' : 'Edit'}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc._id, doc.title)}
                    disabled={readOnly || deletingId === doc._id}
                    title={readOnly ? 'View-only access' : 'Delete'}
                    className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          })}
        </div>
      )}

      <KnowledgeChunkModal
        doc={inspectDoc}
        isOpen={Boolean(inspectDoc)}
        onClose={() => setInspectDoc(null)}
      />
      <KnowledgeEditModal
        doc={editDoc}
        isOpen={Boolean(editDoc)}
        onClose={() => setEditDoc(null)}
        onUpdated={() => { if (onRefresh) onRefresh(); }}
      />
    </div>
  );
}
