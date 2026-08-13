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
      setError(err instanceof Error ? err.message : 'Failed to send product details to ORA.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <select
        aria-label="Product details input method"
        value={mode}
        onChange={(event) => {
          setMode(event.target.value as ProductInputMode);
          clearFile();
        }}
        className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="text">Type product details</option>
        <option value="file">Upload JSON, PDF, or TXT</option>
      </select>

      {mode === 'text' ? (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={13}
          placeholder="Paste product names, descriptions, prices, variants, stock, sizing, specifications, and other details..."
          className="w-full rounded-2xl border border-border bg-surface-low px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        <>
          <label className="flex min-h-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-low px-6 text-center transition-colors hover:bg-surface-high cursor-pointer">
            {fileName.endsWith('.json') ? <FileJson size={34} className="mb-3 text-primary" /> : <FileText size={34} className="mb-3 text-primary" />}
            <span className="text-sm font-medium text-foreground">{fileName || 'Choose a product file'}</span>
            <span className="mt-2 text-xs text-muted-foreground">JSON, PDF, or TXT</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.pdf,.txt,application/json,application/pdf,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {content && (
            <div className="rounded-xl border border-border bg-surface-low p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Product details preview</span>
                <button onClick={clearFile} aria-label="Remove product file" className="hover:text-foreground"><X size={14} /></button>
              </div>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={7} className="w-full resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none" />
            </div>
          )}
        </>
      )}

      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-emerald-400">Product details sent to ORA</span>}
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : mode === 'text' ? <PenLine size={14} /> : <UploadCloud size={14} />}
          {isSaving ? 'Processing' : 'Save Product Details'}
        </button>
      </div>
    </div>
  );
}
