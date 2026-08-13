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
      setError(err instanceof Error ? err.message : 'Failed to send this document to ORA.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <select
        aria-label="Document type"
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {KNOWLEDGE_CATEGORIES.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>

      <label className="flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-low px-6 text-center transition-colors hover:bg-surface-high cursor-pointer">
        <FileText size={34} className="mb-3 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {fileName || 'Choose a business document'}
        </span>
        <span className="mt-2 text-xs text-muted-foreground">PDF, TXT, JSON, or Markdown</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.json,.md,.markdown,application/pdf,application/json,text/plain,text/markdown"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {fileContent && (
        <div className="rounded-xl border border-border bg-surface-low p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Document preview</span>
            <button onClick={clearFile} aria-label="Remove document" className="hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          <textarea
            value={fileContent}
            onChange={(event) => setFileContent(event.target.value)}
            rows={6}
            className="w-full resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none"
          />
        </div>
      )}

      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-emerald-400">Document sent to ORA</span>}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          {isSaving ? 'Processing' : 'Save Document'}
        </button>
      </div>
    </div>
  );
}
