'use client';

import { useEffect, useState } from 'react';
import { X, Layers, Loader2, Database, AlertCircle, Copy, Check } from 'lucide-react';
import { getKnowledgeDocChunksApi } from '@/services/knowledge-service';
import { KnowledgeChunk, KnowledgeDoc } from '@/types/knowledge';
import { useModalA11y } from '@/hooks/use-modal-a11y';

interface KnowledgeChunkModalProps {
  doc: KnowledgeDoc | null;
  isOpen: boolean;
  onClose: () => void;
}

export function KnowledgeChunkModal({ doc, isOpen, onClose }: KnowledgeChunkModalProps) {
  // Escape, focus trap, focus restore and scroll lock. This dialog previously had
  // none of them, so Tab walked straight out into the page behind it.
  const dialogRef = useModalA11y(isOpen, onClose);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && doc?._id) {
      setLoading(true);
      setError(null);
      getKnowledgeDocChunksApi(doc._id)
        .then((data) => {
          setChunks(data || []);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load document sections.');
        })
        .finally(() => setLoading(false));
    } else {
      setChunks([]);
    }
  }, [isOpen, doc?._id]);

  if (!isOpen || !doc) return null;

  const handleCopyChunk = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Knowledge document sections"
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-md border border-border bg-surface-container shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-low px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-border/60 bg-surface-high/40 p-2 text-primary">
              <Layers size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight truncate max-w-md">
                  {doc.title}
                </h2>
                <span className="rounded bg-surface-high border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
                  {doc.docType}
                </span>
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                Indexed document segments referenced during shopper conversations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close document sections modal"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 size={20} className="animate-spin text-primary" />
              <p className="text-xs font-mono">Loading document sections...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          ) : chunks.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Database size={24} className="mx-auto mb-2 opacity-40 text-primary" />
              <p>No document sections found for this entry.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Total Sections: <strong className="text-foreground">{chunks.length}</strong>
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">Ready for customer search</span>
              </div>

              {chunks.map((chunk, index) => (
                <div
                  key={chunk._id || index}
                  className="rounded-md border border-border/60 bg-surface-low p-4 transition-colors hover:border-primary/30 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-primary">
                        Section #{chunk.chunkIndex ?? index}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {chunk.text.length} chars
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyChunk(chunk.text, index)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Copy section text"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check size={12} className="text-primary" />
                          <span className="text-primary">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="rounded-md bg-surface-highest/50 border border-border/50 p-3 text-xs leading-relaxed text-foreground font-mono whitespace-pre-wrap select-text">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-surface-low px-6 py-3.5">
          <span className="text-[11px] text-muted-foreground font-mono">
            Document ID: {doc._id}
          </span>
          <button
            onClick={onClose}
            className="rounded-md bg-surface-high border border-border px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-bright cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
