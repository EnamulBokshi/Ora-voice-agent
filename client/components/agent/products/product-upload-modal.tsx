'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Globe,
  UploadCloud,
  FileSpreadsheet,
  Rss,
  Plus,
  Webhook,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  uploadProductFileApi,
  ingestFeedApi,
  crawlStoreApi,
} from '@/services/ingestion-service';
import { batchSyncProductsApi } from '@/services/products-service';
import { IngestionSummary, CrawlStoreResponse } from '@/types/ingestion';
import { ProductAvailability, SourceTier } from '@/types/product';

interface ProductUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: IngestionTab;
}

export type IngestionTab = 'website' | 'file' | 'feed' | 'manual' | 'webhooks';

const TABS: { id: IngestionTab; label: string; icon: typeof Globe }[] = [
  { id: 'website', label: 'Website URL', icon: Globe },
  { id: 'file', label: 'File Upload', icon: FileSpreadsheet },
  { id: 'feed', label: 'Feed URL', icon: Rss },
  { id: 'manual', label: 'Manual Entry', icon: Plus },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
];

export function ProductUploadModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'website',
}: ProductUploadModalProps) {
  const [activeTab, setActiveTab] = useState<IngestionTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Website Crawl State
  const [websiteDomain, setWebsiteDomain] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlStoreResponse | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);

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

  const handleCrawlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteDomain.trim()) {
      setCrawlError('Please enter a valid website URL or domain.');
      return;
    }

    setIsCrawling(true);
    setCrawlError(null);
    setCrawlResult(null);

    try {
      const res = await crawlStoreApi({ domain: websiteDomain.trim() });
      setCrawlResult(res);
      onSuccess();
    } catch (err) {
      setCrawlError(err instanceof Error ? err.message : 'Failed to crawl website.');
    } finally {
      setIsCrawling(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileError(null);
    setUploadSummary(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setFileError('Please choose a file to upload.');
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
      setFileError(err instanceof Error ? err.message : 'Failed to parse file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) {
      setFeedError('Please enter a valid feed URL.');
      return;
    }

    setIsFeedLoading(true);
    setFeedError(null);
    setFeedSuccess(null);

    try {
      const res = await ingestFeedApi({ feedUrl: feedUrl.trim() });
      setFeedSuccess(`Synced ${res.ingested || 0} products from feed.`);
      setFeedUrl('');
      onSuccess();
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : 'Failed to parse feed.');
    } finally {
      setIsFeedLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSku.trim() || !manualName.trim()) {
      setManualError('SKU and product name are required.');
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

      setManualSuccess(`Product "${manualSku}" added.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg border border-border bg-surface-lowest shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">
              Import Catalog & Knowledge
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Sync products and store policies into ORA.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Tabs — Intercom style underline ── */}
        <div className="flex items-center border-b border-border px-6 overflow-x-auto no-scrollbar -mb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 py-2.5 px-3 text-[12.5px] font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── Tab 0: Website URL ── */}
          {activeTab === 'website' && (
            <form onSubmit={handleCrawlSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Store Website URL
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Globe size={14} />
                  </div>
                  <input
                    type="text"
                    value={websiteDomain}
                    onChange={(e) => setWebsiteDomain(e.target.value)}
                    placeholder="https://mystore.com or store.myshopify.com"
                    disabled={isCrawling}
                    className="w-full rounded-md border border-border bg-transparent pl-9 pr-3 py-2 text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:outline-none font-mono"
                    required
                  />
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  Extracts products, variants, prices, policies, and FAQs automatically.
                </p>
              </div>

              {crawlError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{crawlError}</span>
                </div>
              )}

              {crawlResult && (
                <div className="p-4 rounded-md bg-surface-high/40 border border-border space-y-3">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      Sync Completed
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground uppercase">
                      {crawlResult.platform}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[12px]">
                    <div className="p-2 rounded bg-surface-lowest border border-border">
                      <span className="text-muted-foreground block text-[11px]">Products</span>
                      <span className="font-semibold text-foreground font-mono">{crawlResult.productsIngested}</span>
                    </div>
                    <div className="p-2 rounded bg-surface-lowest border border-border">
                      <span className="text-muted-foreground block text-[11px]">Policies</span>
                      <span className="font-semibold text-foreground font-mono">{crawlResult.knowledgeDocsIngested}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <button
                  type="submit"
                  disabled={isCrawling || !websiteDomain.trim()}
                  className="flex items-center gap-2 h-8 px-4 rounded-md bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isCrawling && <Loader2 size={13} className="animate-spin" />}
                  <span>{isCrawling ? 'Syncing…' : 'Start Sync'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ── Tab 1: File Upload ── */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <label className="flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-border bg-transparent px-6 py-6 text-center hover:border-foreground/30 hover:bg-surface-high/20 cursor-pointer transition-colors">
                <FileSpreadsheet size={24} className="mb-2 text-muted-foreground" />
                <span className="text-[13px] font-medium text-foreground">
                  {selectedFile ? selectedFile.name : 'Drop product file or browse'}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  CSV, XLSX, TSV, JSON, PDF
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv,.json,.txt,.pdf,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {fileError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {uploadSummary && (
                <div className="p-4 rounded-md bg-surface-high/40 border border-border space-y-2">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Upload Completed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-[12px]">
                    <div className="p-2 rounded bg-surface-lowest border border-border">
                      <span className="text-muted-foreground block text-[11px]">Total Parsed</span>
                      <span className="font-semibold text-foreground font-mono">{uploadSummary.totalParsed}</span>
                    </div>
                    <div className="p-2 rounded bg-surface-lowest border border-border">
                      <span className="text-muted-foreground block text-[11px]">Synced to Catalog</span>
                      <span className="font-semibold text-foreground font-mono">{uploadSummary.ingested}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || isUploading}
                  className="flex items-center gap-2 h-8 px-4 rounded-md bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                  <span>{isUploading ? 'Uploading…' : 'Upload File'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Tab 2: Feed URL ── */}
          {activeTab === 'feed' && (
            <form onSubmit={handleFeedSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Feed URL (XML / RSS / CSV)
                </label>
                <input
                  type="url"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://example.com/feeds/products.xml"
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-[12.5px] font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:outline-none"
                  required
                />
              </div>

              {feedError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{feedError}</span>
                </div>
              )}

              {feedSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-surface-high border border-border text-foreground text-[12.5px]">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>{feedSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <button
                  type="submit"
                  disabled={isFeedLoading || !feedUrl.trim()}
                  className="flex items-center gap-2 h-8 px-4 rounded-md bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isFeedLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>{isFeedLoading ? 'Syncing…' : 'Sync Feed'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ── Tab 3: Manual SKU ── */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    SKU / ID
                  </label>
                  <input
                    type="text"
                    value={manualSku}
                    onChange={(e) => setManualSku(e.target.value)}
                    placeholder="e.g. SKU-10024"
                    className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-[12.5px] font-mono text-foreground focus:border-foreground/30 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    placeholder="e.g. Apparel"
                    className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-[12.5px] text-foreground focus:border-foreground/30 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Wool Overcoat"
                  className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-[12.5px] text-foreground focus:border-foreground/30 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-[12.5px] font-mono text-foreground focus:border-foreground/30 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualStock}
                    onChange={(e) => setManualStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-[12.5px] font-mono text-foreground focus:border-foreground/30 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Status
                  </label>
                  <select
                    value={manualAvail}
                    onChange={(e) => setManualAvail(e.target.value as ProductAvailability)}
                    className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-[12px] text-foreground focus:border-foreground/30 focus:outline-none"
                  >
                    <option value={ProductAvailability.IN_STOCK}>In Stock</option>
                    <option value={ProductAvailability.OUT_OF_STOCK}>Out of Stock</option>
                    <option value={ProductAvailability.PREORDER}>Pre-Order</option>
                    <option value={ProductAvailability.DISCONTINUED}>Discontinued</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  rows={2}
                  placeholder="Details, materials, sizing notes..."
                  className="w-full rounded-md border border-border bg-transparent p-2.5 text-[12.5px] text-foreground focus:border-foreground/30 focus:outline-none resize-none"
                />
              </div>

              {manualError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              {manualSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-surface-high border border-border text-foreground text-[12.5px]">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>{manualSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-border">
                <button
                  type="submit"
                  disabled={isManualSaving}
                  className="flex items-center gap-2 h-8 px-4 rounded-md bg-primary text-[12px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isManualSaving && <Loader2 size={13} className="animate-spin" />}
                  <span>{isManualSaving ? 'Adding…' : 'Add Product'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ── Tab 4: Webhooks ── */}
          {activeTab === 'webhooks' && (
            <div className="space-y-4 text-[12.5px]">
              <p className="text-muted-foreground">
                Connect your e-commerce platform webhook to sync product creation, price updates, and inventory changes automatically.
              </p>

              <div className="space-y-3">
                {/* Shopify */}
                <div className="p-3.5 rounded-md border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Shopify Webhook</span>
                    <span className="text-[11px] font-mono text-muted-foreground">HMAC</span>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground bg-surface-high/50 p-2 rounded select-all break-all">
                    https://ora.hypecorps.com/api/v1/ingestion/webhooks/shopify
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Subscribe to: <code className="font-mono">products/create</code>, <code className="font-mono">products/update</code>, <code className="font-mono">inventory_levels/update</code>.
                  </p>
                </div>

                {/* WooCommerce */}
                <div className="p-3.5 rounded-md border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">WooCommerce Webhook</span>
                    <span className="text-[11px] font-mono text-muted-foreground">Signature</span>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground bg-surface-high/50 p-2 rounded select-all break-all">
                    https://ora.hypecorps.com/api/v1/ingestion/webhooks/woocommerce
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Subscribe to: <code className="font-mono">product.created</code>, <code className="font-mono">product.updated</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
