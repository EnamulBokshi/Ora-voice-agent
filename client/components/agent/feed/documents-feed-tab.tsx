'use client';

import { useRef, useState } from 'react';
import {
  Loader2,
  UploadCloud,
  X,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import {
  createKnowledgeDocApi,
  uploadKnowledgeFileApi,
} from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';
import { ProductUploadModal } from '../products/product-upload-modal';
import { useReadOnly } from '@/components/common/read-only-fence';

interface DocumentsFeedTabProps {
  onFed: () => void;
}

const DOCUMENT_CATEGORIES: { id: string; label: string; docType: DocType; placeholder: string }[] = [
  { id: 'policy',        label: 'Store Policy',    docType: DocType.POLICY,        placeholder: 'e.g. Return window is 14 days with original tags...' },
  { id: 'faq',           label: 'FAQ',              docType: DocType.FAQ,           placeholder: 'Q: What are your shipping rates?\nA: Standard delivery is $4.99...' },
  { id: 'brand_rule',    label: 'Brand Guidelines', docType: DocType.BRAND_RULE,    placeholder: 'e.g. Always be polite, warm, concise...' },
  { id: 'sales_playbook',label: 'Sales Playbook',   docType: DocType.SALES_PLAYBOOK,placeholder: 'e.g. If customer asks about denim jackets, recommend...' },
  { id: 'uploaded_doc',  label: 'General Reference',docType: DocType.UPLOADED_DOC,  placeholder: 'e.g. General store context, vendor warranty specs...' },
  { id: 'product_manual',label: 'Product Manual',   docType: DocType.PRODUCT_MANUAL,placeholder: 'e.g. Leather boots care: Apply beeswax protector...' },
];

export function DocumentsFeedTab({ onFed }: DocumentsFeedTabProps) {
  const readOnly = useReadOnly();
  const [inputMode, setInputMode]     = useState<'upload' | 'text'>('upload');
  const [selectedCatId, setSelectedCatId] = useState<string>('policy');
  const [docTitle, setDocTitle]       = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCategory =
    DOCUMENT_CATEGORIES.find((c) => c.id === selectedCatId) || DOCUMENT_CATEGORIES[0];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    setError(null);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Both branches below post to `@Roles(OWNER, ADMIN)` routes.
    if (readOnly) return;
    setError(null);
    setSavedMessage(null);

    const finalTitle =
      docTitle.trim() ||
      (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : activeCategory.label);

    if (inputMode === 'upload') {
      if (!selectedFile) { setError('Select a file to upload.'); return; }
      setIsSaving(true);
      try {
        await uploadKnowledgeFileApi(selectedFile, activeCategory.docType, finalTitle);
        setDocTitle(''); clearFile();
        setSavedMessage(`"${finalTitle}" uploaded.`);
        setTimeout(() => setSavedMessage(null), 4000);
        onFed();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally { setIsSaving(false); }
    } else {
      if (!textContent.trim()) { setError('Enter document text first.'); return; }
      setIsSaving(true);
      try {
        await createKnowledgeDocApi({
          title: finalTitle,
          docType: activeCategory.docType,
          content: textContent.trim(),
          metadata: { source: 'text_feed' },
        });
        setDocTitle(''); setTextContent('');
        setSavedMessage(`"${finalTitle}" saved.`);
        setTimeout(() => setSavedMessage(null), 4000);
        onFed();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed.');
      } finally { setIsSaving(false); }
    }
  };

  return (
    <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-6">
      {/* ── Import from URL — clean prominent action row ── */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h3 className="text-[13px] font-semibold text-foreground font-serif">
            Upload & Sync Documents
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsSyncModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-md text-[12px] font-medium border border-border/60 bg-surface-container/60 hover:bg-surface-high text-foreground transition-colors cursor-pointer"
        >
          <Globe size={12} className="text-muted-foreground" />
          <span>Import from URL</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Input mode tabs ── */}
        <div className="flex items-center gap-0 border-b border-border/40">
          {(['upload', 'text'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setInputMode(mode)}
              className={`relative px-4 py-2 text-[12.5px] font-medium transition-colors cursor-pointer ${
                inputMode === mode
                  ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'upload' ? 'File Upload' : 'Type / Paste'}
            </button>
          ))}
        </div>

        {/* ── Row: Category + Title ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-surface-high/30 px-3 py-2 text-[13px] text-foreground focus:border-foreground focus:outline-none cursor-pointer"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Title <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Auto-filled from file name"
              className="w-full rounded-md border border-border/60 bg-surface-high/30 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none font-mono text-xs"
            />
          </div>
        </div>

        {/* ── Upload zone OR text area ── */}
        {inputMode === 'upload' ? (
          <div>
            {!selectedFile ? (
              <label className="flex flex-col items-center justify-center h-32 rounded-md border border-dashed border-border/60 bg-surface-high/20 cursor-pointer hover:border-foreground/40 hover:bg-surface-high/40 transition-colors text-center px-4">
                <UploadCloud size={20} className="text-muted-foreground mb-2" />
                <span className="text-[13px] text-foreground font-medium">Drop file or click to browse</span>
                <span className="text-[11px] font-mono text-muted-foreground mt-0.5">PDF, TXT, MD, CSV</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.json,.md,.markdown,.csv,.tsv,.xlsx,application/pdf,application/json,text/plain,text/markdown,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between py-3 px-4 rounded-md border border-border/60 bg-surface-high/30">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                Document Text
              </label>
              <span className="text-[11px] text-muted-foreground/60 font-mono">
                {textContent.length} chars
              </span>
            </div>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
              placeholder={activeCategory.placeholder}
              className="w-full rounded-md border border-border/60 bg-surface-high/20 p-3 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none resize-none font-mono"
            />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <p className="text-[12px] text-red-400 font-mono">{error}</p>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          {savedMessage ? (
            <span className="flex items-center gap-1.5 text-[12px] text-foreground font-mono">
              <CheckCircle2 size={13} className="text-[color:var(--status-online)]" />
              {savedMessage}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground/60">
              PDF, TXT, MD, CSV supported
            </span>
          )}

          <button
            type="submit"
            disabled={readOnly || isSaving}
            title={readOnly ? 'View-only access' : undefined}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
            {isSaving ? 'Saving…' : 'Save & Index'}
          </button>
        </div>
      </form>

      <ProductUploadModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={() => { setIsSyncModalOpen(false); onFed(); }}
        initialTab="website"
      />
    </div>
  );
}
