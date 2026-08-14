'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { KNOWLEDGE_CATEGORIES } from './feed-types';

interface DocumentsFeedTabProps {
  onFed: () => void;
}

export function DocumentsFeedTab({ onFed }: DocumentsFeedTabProps) {
  const [categoryId, setCategoryId] = useState(KNOWLEDGE_CATEGORIES[0].id);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (loadEvent) => setFileContent((loadEvent.target?.result as string) || '');
    reader.onerror = () => setError('Could not read this file. Try another document.');
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName('');
    setFileContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!fileName || !fileContent.trim()) {
      setError('Choose a document before sending it to ORA.');
      return;
    }

    const category = KNOWLEDGE_CATEGORIES.find((item) => item.id === categoryId)!;
    setIsSaving(true);
    setError(null);
    try {
      await createKnowledgeDocApi({
        title: fileName.replace(/\.[^/.]+$/, ''),
        docType: category.docType,
        content: fileContent.trim(),
        metadata: { source: 'document_upload', originalFileName: fileName },
      });
      clearFile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onFed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <select
        aria-label="Document category"
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        className="w-full rounded-md border border-border bg-surface-low px-3.5 py-2.5 text-xs font-medium text-foreground focus:outline-none focus:border-primary"
      >
        {KNOWLEDGE_CATEGORIES.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>

      <label className="flex min-h-44 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-low px-6 py-8 text-center transition-colors hover:bg-surface-high cursor-pointer">
        <FileText size={30} className="mb-2.5 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {fileName || 'Choose a reference document'}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">PDF, TXT, JSON, or Markdown</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.json,.md,.markdown,application/pdf,application/json,text/plain,text/markdown"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {fileContent && (
        <div className="rounded-md border border-border bg-surface-low p-3.5">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Document preview</span>
            <button onClick={clearFile} aria-label="Remove document" className="hover:text-foreground">
              <X size={13} />
            </button>
          </div>
          <textarea
            value={fileContent}
            onChange={(event) => setFileContent(event.target.value)}
            rows={6}
            className="w-full resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none font-mono"
          />
        </div>
      )}

      {error && <p className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-xs font-medium text-[color:var(--status-online)]">
            Document saved to knowledge base
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
          {isSaving ? 'Processing' : 'Save Document'}
        </button>
      </div>
    </div>
  );
}
