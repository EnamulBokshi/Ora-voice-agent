'use client';

import { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Rss,
  PlusCircle,
  Webhook,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { uploadProductFileApi, ingestFeedApi } from '@/services/ingestion-service';
import { batchSyncProductsApi } from '@/services/products-service';
import { IngestionSummary } from '@/types/ingestion';
import { ProductAvailability, SourceTier } from '@/types/product';

interface ProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type IngestionTab = 'file' | 'feed' | 'manual' | 'webhooks';

export function ProductUploadModal({ isOpen, onClose, onSuccess }: ProductUploadModalProps) {
  const [activeTab, setActiveTab] = useState<IngestionTab>('file');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<IngestionSummary | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feed URL State
  const [feedUrl, setFeedUrl] = useState('');
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedSuccess, setFeedSuccess] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Manual SKU Entry State
  const [manualSku, setManualSku] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState<number>(0);
  const [manualCurrency, setManualCurrency] = useState('USD');
  const [manualStock, setManualStock] = useState<number>(10);
  const [manualAvail, setManualAvail] = useState<ProductAvailability>(ProductAvailability.IN_STOCK);
  const [manualCategory, setManualCategory] = useState('General');
  const [manualDesc, setManualDesc] = useState('');
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileError(null);
    setUploadSummary(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setFileError('Please choose a product file to upload.');
      return;
    }

    setIsUploading(true);
    setFileError(null);
    setUploadSummary(null);

    try {
      const summary = await uploadProductFileApi(selectedFile);
      setUploadSummary(summary);
      onSuccess();
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to parse and ingest product file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) {
      setFeedError('Please enter a valid catalog feed URL.');
      return;
    }

    setIsFeedLoading(true);
    setFeedError(null);
    setFeedSuccess(null);

    try {
      const res = await ingestFeedApi({ feedUrl: feedUrl.trim() });
      setFeedSuccess(
        `Successfully synced ${res.ingested || 0} products from feed. Auto-embedded into Gemini vector index.`,
      );
      setFeedUrl('');
      onSuccess();
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : 'Failed to parse catalog feed.');
    } finally {
      setIsFeedLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSku.trim() || !manualName.trim()) {
      setManualError('Product SKU and name are required.');
      return;
    }

    setIsManualSaving(true);
    setManualError(null);
    setManualSuccess(null);

    try {
      await batchSyncProductsApi({
        sourceTier: SourceTier.TIER4_MANUAL,
        products: [
          {
            nativeProductId: manualSku.trim(),
            name: manualName.trim(),
            description: manualDesc.trim() || undefined,
            price: Number(manualPrice),
            currency: manualCurrency.trim(),
            stockQuantity: Number(manualStock),
            availability: manualAvail,
            category: manualCategory.trim() || 'General',
          },
        ],
      });

      setManualSuccess(`Product SKU "${manualSku}" added to catalog and embedded for AI voice discovery.`);
      setManualSku('');
      setManualName('');
      setManualDesc('');
      setManualPrice(0);
      setManualStock(10);
      onSuccess();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Failed to add product.');
    } finally {
      setIsManualSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface-container shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-low px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Product Catalog Ingestion Engine
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bulk upload files, connect XML/CSV feeds, or configure store webhooks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close product ingestion modal"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Ingestion Tabs */}
        <div className="flex items-center border-b border-border bg-surface-lowest px-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'file'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>File Upload (CSV/XLSX/PDF)</span>
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'feed'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Rss size={14} />
            <span>Feed URL (XML/RSS)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <PlusCircle size={14} />
            <span>Manual SKU Entry</span>
          </button>

          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'webhooks'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Webhook size={14} />
            <span>Platform Webhooks</span>
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {activeTab === 'file' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <label className="flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-low px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-surface-high/50 cursor-pointer">
              <FileSpreadsheet size={36} className="mb-2 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {selectedFile ? selectedFile.name : 'Click to select or drag & drop product catalog file'}
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">
                Supports CSV, XLSX, TSV, TXT, or PDF tables (up to 10,000 SKUs)
              </span>
              {selectedFile && (
                <span className="mt-2 text-[10px] font-mono text-primary font-bold">
                  {(selectedFile.size / 1024).toFixed(1)} KB ready
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,.txt,.pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {fileError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {uploadSummary && (
              <div className="rounded-xl border border-border bg-surface-low p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2 size={16} className="text-primary" />
                  <span>Ingestion Completed Successfully</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-border bg-surface-lowest p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Parsed</span>
                    <p className="text-base font-bold text-foreground font-mono mt-0.5">{uploadSummary.totalParsed}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-lowest p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Synced to DB</span>
                    <p className="text-base font-bold text-primary font-mono mt-0.5">{uploadSummary.ingested}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-lowest p-2.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Vector Embedded</span>
                    <p className="text-base font-bold text-foreground font-mono mt-0.5">{uploadSummary.embedded}</p>
                  </div>
                </div>

                {uploadSummary.detectedMapping && Object.keys(uploadSummary.detectedMapping).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Detected Column Mappings:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(uploadSummary.detectedMapping).map(([field, col]) => (
                        <span
                          key={field}
                          className="rounded-md border border-border bg-surface-lowest px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                        >
                          <strong className="text-foreground">{field}</strong> &larr; {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {uploadSummary.errors && uploadSummary.errors.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-400 space-y-1">
                    <p className="font-semibold">Row Warnings ({uploadSummary.errors.length}):</p>
                    <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                      {uploadSummary.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Sparkles size={13} className="text-primary" />
                <span>Auto-normalized and embedded into Gemini VectorIndex.</span>
              </div>
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 shadow-xs"
              >
                {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                {isUploading ? 'Parsing & Indexing...' : 'Upload & Sync Products'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Feed URL */}
        {activeTab === 'feed' && (
          <form onSubmit={handleFeedSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Catalog Feed URL (RSS / Atom / Google Merchant XML / CSV)
              </label>
              <input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://example.com/feeds/products.xml"
                className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                ORA fetches XML product feeds and synchronizes catalog stock & prices with a confidence score of 70%.
              </p>
            </div>

            {feedError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>{feedError}</span>
              </div>
            )}

            {feedSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{feedSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-border">
              <button
                type="submit"
                disabled={isFeedLoading || !feedUrl.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 shadow-xs"
              >
                {isFeedLoading && <Loader2 size={13} className="animate-spin" />}
                {isFeedLoading ? 'Fetching Feed...' : 'Sync Catalog Feed'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Manual SKU Entry */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Native SKU / Product ID
                </label>
                <input
                  type="text"
                  value={manualSku}
                  onChange={(e) => setManualSku(e.target.value)}
                  placeholder="e.g. SKU-10024"
                  className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                  placeholder="e.g. Apparel, Shoes"
                  className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Product Title / Name
              </label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Premium Wool Blend Overcoat"
                className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Stock Units
                </label>
                <input
                  type="number"
                  min="0"
                  value={manualStock}
                  onChange={(e) => setManualStock(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Availability
                </label>
                <select
                  value={manualAvail}
                  onChange={(e) => setManualAvail(e.target.value as ProductAvailability)}
                  className="w-full rounded-lg border border-border bg-surface-low px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                >
                  <option value={ProductAvailability.IN_STOCK}>In Stock</option>
                  <option value={ProductAvailability.OUT_OF_STOCK}>Out of Stock</option>
                  <option value={ProductAvailability.PREORDER}>Pre-Order</option>
                  <option value={ProductAvailability.DISCONTINUED}>Discontinued</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Description & Sizing Specs
              </label>
              <textarea
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                rows={3}
                placeholder="Product description, sizing chart notes, materials..."
                className="w-full rounded-lg border border-border bg-surface-low p-3 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
              />
            </div>

            {manualError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            {manualSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{manualSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-border">
              <button
                type="submit"
                disabled={isManualSaving}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 shadow-xs"
              >
                {isManualSaving && <Loader2 size={13} className="animate-spin" />}
                {isManualSaving ? 'Adding SKU...' : 'Add SKU to Catalog'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Platform Webhooks */}
        {activeTab === 'webhooks' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Tier 1 Real-Time E-Commerce Connectors
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your Shopify or WooCommerce store directly. Any product creation, stock update, or price change is pushed live to ORA within seconds and verified at 100% confidence.
              </p>
            </div>

            {/* Shopify Webhook Box */}
            <div className="rounded-xl border border-border bg-surface-low p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
                    S
                  </span>
                  <span className="text-xs font-bold text-foreground">Shopify Webhook Listener</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-high border border-border text-muted-foreground">
                  HMAC Verified
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-muted-foreground">Endpoint URL:</span>
                <p className="rounded-lg bg-surface-lowest p-2.5 font-mono text-[11px] text-foreground border border-border select-all">
                  https://ora.hypecorps.com/api/v1/ingestion/webhooks/shopify
                </p>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Subscribe to topics: <code className="text-primary font-mono">products/create</code>, <code className="text-primary font-mono">products/update</code>, <code className="text-primary font-mono">inventory_levels/update</code>.
              </p>
            </div>

            {/* WooCommerce Webhook Box */}
            <div className="rounded-xl border border-border bg-surface-low p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs font-bold font-mono">
                    W
                  </span>
                  <span className="text-xs font-bold text-foreground">WooCommerce Webhook Listener</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-high border border-border text-muted-foreground">
                  Signature Verified
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-muted-foreground">Endpoint URL:</span>
                <p className="rounded-lg bg-surface-lowest p-2.5 font-mono text-[11px] text-foreground border border-border select-all">
                  https://ora.hypecorps.com/api/v1/ingestion/webhooks/woocommerce
                </p>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Topic events: <code className="text-primary font-mono">product.created</code>, <code className="text-primary font-mono">product.updated</code>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
