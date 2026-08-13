'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, PenLine } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { KNOWLEDGE_CATEGORIES } from './feed-types';
import { cn } from '@/lib/utils';

interface TextFeedTabProps {
  onFed: () => void;
}

export function TextFeedTab({ onFed }: TextFeedTabProps) {
  const [categoryId, setCategoryId] = useState(KNOWLEDGE_CATEGORIES[0].id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Add a title and some content first.');
      return;
    }

    const category = KNOWLEDGE_CATEGORIES.find((c) => c.id === categoryId)!;
    setIsSaving(true);
    setError(null);
    try {
      await createKnowledgeDocApi({
        title: title.trim(),
        docType: category.docType,
        content: content.trim(),
        metadata: { source: 'text_feed' },
      });
      setTitle('');
      setContent('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onFed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to feed knowledge to ORA.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Category picker */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          What are you writing about?
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {KNOWLEDGE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                categoryId === cat.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface-low hover:bg-surface-high',
              )}
            >
              <p className="text-xs font-semibold text-foreground">{cat.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Delivery areas & charges, Size guide, About our brand..."
          className="w-full rounded-xl border border-border bg-surface-low px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Type or paste the information ORA should know. Write naturally — ORA will use it to answer customer questions."
          className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
            <CheckCircle2 size={14} /> Fed to ORA
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              <PenLine size={14} /> Save Knowledge
            </>
          )}
        </button>
      </div>
    </div>
  );
}
