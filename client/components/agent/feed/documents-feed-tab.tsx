'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, UploadCloud, X, PenTool, CheckCircle2, Sparkles } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';

interface DocumentsFeedTabProps {
  onFed: () => void;
}

const DOCUMENT_CATEGORIES: { id: string; label: string; docType: DocType; placeholder: string }[] = [
  {
    id: 'policy',
    label: 'Store Policy (Returns, Shipping, Exchanges)',
    docType: DocType.POLICY,
    placeholder: 'e.g. Return window is 14 days with original tags. Exchanges are free of charge within Dhaka...',
  },
  {
    id: 'faq',
    label: 'Frequently Asked Questions (FAQ)',
    docType: DocType.FAQ,
    placeholder: 'Q: What are your shipping rates?\nA: Standard delivery is $4.99 or free on orders over $50...',
  },
  {
    id: 'brand_rule',
    label: 'Brand Guidelines & Tone of Voice',
    docType: DocType.BRAND_RULE,
    placeholder: 'e.g. Always be polite, warm, concise, and energetic. Mention seasonal promotions when asked...',
  },
  {
    id: 'sales_playbook',
    label: 'Sales Playbook & Pitch Rules',
    docType: DocType.SALES_PLAYBOOK,
    placeholder: 'e.g. If customer asks about denim jackets, recommend the matching fleece-lined scarf...',
  },
  {
    id: 'uploaded_doc',
    label: 'General Store Reference Document',
    docType: DocType.UPLOADED_DOC,
    placeholder: 'e.g. General store context, vendor warranty specs, warehouse operating hours...',
  },
  {
    id: 'product_manual',
    label: 'Product Usage Manual & Care Guide',
    docType: DocType.PRODUCT_MANUAL,
    placeholder: 'e.g. Leather boots care: Apply beeswax protector before first wear. Clean with damp cloth...',
  },
];

export function DocumentsFeedTab({ onFed }: DocumentsFeedTabProps) {
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  const [selectedCatId, setSelectedCatId] = useState<string>('policy');
  const [docTitle, setDocTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCategory =
    DOCUMENT_CATEGORIES.find((c) => c.id === selectedCatId) || DOCUMENT_CATEGORIES[0];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (loadEvent) => setFileContent((loadEvent.target?.result as string) || '');
    reader.onerror = () => setError('Could not read this file. Please try another document.');
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName('');
    setFileContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalContent = inputMode === 'upload' ? fileContent.trim() : textContent.trim();
    const finalTitle = docTitle.trim() || (inputMode === 'upload' ? fileName.replace(/\.[^/.]+$/, '') : `${activeCategory.label} Note`);

    if (!finalContent) {
      setError(
        inputMode === 'upload'
          ? 'Please select and upload a valid document file.'
          : 'Please enter document text before saving.',
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await createKnowledgeDocApi({
        title: finalTitle,
        docType: activeCategory.docType,
        content: finalContent,
        metadata: {
          source: inputMode === 'upload' ? 'document_upload' : 'text_feed',
          originalFileName: fileName || undefined,
        },
      });

      // Clear inputs
      setDocTitle('');
      setTextContent('');
      clearFile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onFed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document to knowledge base.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Mode Selector & Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Input Method
          </label>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-border bg-surface-low">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'upload'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high'
              }`}
            >
              <UploadCloud size={13} />
              <span>File Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'text'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high'
              }`}
            >
              <PenTool size={13} />
              <span>Type / Paste</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Category Type
          </label>
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Title */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          Document Title
        </label>
        <input
          type="text"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          placeholder={`e.g. ${activeCategory.label.split('(')[0].trim()}`}
          className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Input Mode 1: File Upload */}
      {inputMode === 'upload' ? (
        <div className="space-y-3">
          <label className="flex min-h-36 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-low px-6 py-6 text-center transition-colors hover:border-primary/40 hover:bg-surface-high/50 cursor-pointer">
            <UploadCloud size={28} className="mb-2 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {fileName || 'Click to select or drag & drop document file'}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              PDF, TXT, JSON, Markdown (.md)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.json,.md,.markdown,application/pdf,application/json,text/plain,text/markdown"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {fileContent && (
            <div className="rounded-xl border border-border bg-surface-low p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  File Preview ({fileContent.length} chars)
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  aria-label="Remove document"
                  className="rounded p-1 hover:text-foreground hover:bg-surface-high transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                rows={5}
                className="w-full resize-none bg-surface-lowest rounded-lg border border-border p-2.5 text-xs leading-relaxed text-foreground outline-none font-mono focus:border-primary"
              />
            </div>
          )}
        </div>
      ) : (
        /* Input Mode 2: Direct Text Input */
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-foreground">
              Document Text / Guidelines
            </label>
            <span className="text-[11px] text-muted-foreground font-mono">
              {textContent.length} chars
            </span>
          </div>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={8}
            placeholder={activeCategory.placeholder}
            className="w-full rounded-xl border border-border bg-surface-low p-3.5 text-xs font-mono leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Footer & Submit */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles size={13} className="text-primary" />
          <span>Auto-chunked and embedded for Gemini vector search.</span>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary animate-in fade-in">
              <CheckCircle2 size={14} />
              <span>Document indexed successfully</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 shadow-xs"
          >
            {isSaving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <UploadCloud size={13} />
            )}
            {isSaving ? 'Indexing...' : 'Save & Index Document'}
          </button>
        </div>
      </div>
    </form>
  );
}
