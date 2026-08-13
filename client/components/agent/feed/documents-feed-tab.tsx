'use client';

import { useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, CheckCircle2, X } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { KNOWLEDGE_CATEGORIES } from './feed-types';
import { cn } from '@/lib/utils';

interface DocumentsFeedTabProps {
  onFed: () => void;
}

export function DocumentsFeedTab({ onFed }: DocumentsFeedTabProps) {
  const [categoryId, setCategoryId] = useState(KNOWLEDGE_CATEGORIES[0].id);
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent((event.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName('');
    setFileContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!title.trim() || !fileContent.trim()) {
      setError('Add a title and select a document first.');
      return;
    }

    const category = KNOWLEDGE_CATEGORIES.find((c) => c.id === categoryId)!;
    setIsSaving(true);
    setError(null);
    try {
      await createKnowledgeDocApi({
        title: title.trim(),
        docType: category.docType,
        content: fileContent.trim(),
        metadata: { source: 'document_upload', originalFileName: fileName },
      });
      setTitle('');
      clearFile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onFed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to feed document to ORA.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Category picker */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          What does this document describe?
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
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Document Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Return Policy 2026, Product Catalog, Company Profile..."
          className="w-full rounded-xl border border-border bg-surface-low px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Drop zone */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Business Document
        </label>
        <label
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-surface-high/50 transition-colors"
        >
          <FileText size={32} className="text-primary mb-2 opacity-80" />
          <span className="text-xs font-semibold text-foreground">
            {fileName || 'Click to select a .txt, .md, .csv or .json file'}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1">
            Content is processed and indexed for ORA instantly
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,.csv,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Extracted preview */}
      {fileContent && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Extracted Content
            </label>
            <button
              onClick={clearFile}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X size={11} /> Remove file
            </button>
          </div>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed font-mono resize-none"
          />
        </div>
      )}

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
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Indexing...
            </>
          ) : (
            <>
              <UploadCloud size={14} /> Feed to ORA
            </>
          )}
        </button>
      </div>
    </div>
  );
}
