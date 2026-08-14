'use client';

import { useRef, useState } from 'react';
import { FileText, FileJson, Loader2, PenLine, UploadCloud, X } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';

interface ProductDetailsFeedTabProps {
  onFed: () => void;
}

type ProductInputMode = 'text' | 'file';

export function ProductDetailsFeedTab({ onFed }: ProductDetailsFeedTabProps) {
  const [mode, setMode] = useState<ProductInputMode>('text');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
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
    reader.onload = (loadEvent) => setContent((loadEvent.target?.result as string) || '');
    reader.onerror = () => setError('Could not read this product file. Try another file.');
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName('');
    setContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Add product details before sending them to ORA.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await createKnowledgeDocApi({
        title: fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Product details',
        docType: DocType.PRODUCT_MANUAL,
        content: content.trim(),
        metadata: { source: mode === 'file' ? 'product_file' : 'product_text', originalFileName: fileName || undefined },
      });
      clearFile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onFed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <select
        aria-label="Product details input method"
        value={mode}
        onChange={(event) => {
          setMode(event.target.value as ProductInputMode);
          clearFile();
        }}
        className="w-full rounded-md border border-border bg-surface-low px-3.5 py-2.5 text-xs font-medium text-foreground focus:outline-none focus:border-primary"
      >
        <option value="text">Type or paste product details</option>
        <option value="file">Upload JSON, PDF, or TXT file</option>
      </select>

      {mode === 'text' ? (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={11}
          placeholder="Enter product names, descriptions, prices, variants, stock, sizing, specifications, and SKU details..."
          className="w-full rounded-md border border-border bg-surface-low px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />
      ) : (
        <>
          <label className="flex min-h-44 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-low px-6 py-8 text-center transition-colors hover:bg-surface-high cursor-pointer">
            {fileName.endsWith('.json') ? <FileJson size={30} className="mb-2.5 text-primary" /> : <FileText size={30} className="mb-2.5 text-primary" />}
            <span className="text-sm font-medium text-foreground">{fileName || 'Choose a product catalog or manual file'}</span>
            <span className="mt-1 text-xs text-muted-foreground">JSON, PDF, or TXT</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.pdf,.txt,application/json,application/pdf,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {content && (
            <div className="rounded-md border border-border bg-surface-low p-3.5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Product details preview</span>
                <button onClick={clearFile} aria-label="Remove product file" className="hover:text-foreground"><X size={13} /></button>
              </div>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} className="w-full resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none font-mono" />
            </div>
          )}
        </>
      )}

      {error && <p className="rounded-md border border-error/20 bg-error/10 p-3 text-xs text-error">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-xs font-medium text-[color:var(--status-online)]">
            Product details saved to catalog index
          </span>
        )}
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50">
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : mode === 'text' ? <PenLine size={13} /> : <UploadCloud size={13} />}
          {isSaving ? 'Processing' : 'Save Product Details'}
        </button>
      </div>
    </div>
  );
}
