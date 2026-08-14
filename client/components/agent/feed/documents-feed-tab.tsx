'use client';

import { useRef, useState } from 'react';
import {
  FileText,
  Loader2,
  UploadCloud,
  X,
  PenTool,
  CheckCircle2,
  Sparkles,
  FileCheck,
  AlertCircle,
  Package,
} from 'lucide-react';
import {
  createKnowledgeDocApi,
  uploadKnowledgeFileApi,
} from '@/services/knowledge-service';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCsv, setIsCsv] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCategory =
    DOCUMENT_CATEGORIES.find((c) => c.id === selectedCatId) || DOCUMENT_CATEGORIES[0];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const ext = file.name.toLowerCase().split('.').pop() || '';
    setIsCsv(ext === 'csv' || ext === 'tsv' || ext === 'xlsx');

    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    setError(null);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setIsCsv(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);

    const finalTitle =
      docTitle.trim() ||
      (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : `${activeCategory.label} Document`);

    if (inputMode === 'upload') {
      if (!selectedFile) {
        setError('Please select a valid document file (PDF, TXT, MD, CSV, etc.) to upload.');
        return;
      }

      setIsSaving(true);
      try {
        await uploadKnowledgeFileApi(selectedFile, activeCategory.docType, finalTitle);
        setDocTitle('');
        clearFile();
        setSavedMessage(`Document "${finalTitle}" uploaded & vectorized successfully!`);
        setTimeout(() => setSavedMessage(null), 4000);
        onFed();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse and upload document.');
      } finally {
        setIsSaving(false);
      }
    } else {
      const finalContent = textContent.trim();
      if (!finalContent) {
        setError('Please enter document text before saving.');
        return;
      }

      setIsSaving(true);
      try {
        await createKnowledgeDocApi({
          title: finalTitle,
          docType: activeCategory.docType,
          content: finalContent,
          metadata: {
            source: 'text_feed',
          },
        });

        setDocTitle('');
        setTextContent('');
        setSavedMessage(`Document "${finalTitle}" saved & indexed!`);
        setTimeout(() => setSavedMessage(null), 4000);
        onFed();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save document to knowledge base.');
      } finally {
        setIsSaving(false);
      }
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
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${inputMode === 'upload'
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
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${inputMode === 'text'
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
              {selectedFile ? selectedFile.name : 'Click to select or drag & drop document file'}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              PDF (.pdf), TXT, Markdown (.md), JSON, CSV
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.json,.md,.markdown,.csv,.tsv,.xlsx,application/pdf,application/json,text/plain,text/markdown,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {selectedFile && (
            <div className="rounded-xl border border-border bg-surface-low p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 text-primary">
                    <FileCheck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  aria-label="Remove document"
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {isCsv && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-300">
                  <Package size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Product Catalog CSV Detected:</strong>
                    <p className="text-[10px] text-amber-300/90 mt-0.5">
                      If this file contains store products with prices and stock, upload it under the <strong>Products Tab</strong> to create individual catalog items. If it&apos;s general store knowledge, saving it here will index it as reference text.
                    </p>
                  </div>
                </div>
              )}
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
          <span>Server-side PDF parsing & auto-vectorized in Gemini.</span>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary animate-in fade-in">
              <CheckCircle2 size={14} />
              <span>{savedMessage}</span>
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
            {isSaving ? 'Extracting & Indexing...' : 'Save & Index Document'}
          </button>
        </div>
      </div>
    </form>
  );
}
