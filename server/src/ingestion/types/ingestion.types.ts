export type PlatformType = 'shopify' | 'woocommerce' | 'custom';

export interface PlatformDetectionResult {
  platform: PlatformType;
  domain: string;
  confidence: 'high' | 'low';
  evidence: string[]; // human-readable reasons, useful for debugging/logging
}

export type DiscoveredUrlKind = 'product' | 'policy' | 'faq' | 'page' | 'services' | 'pricing' | 'unknown';

export interface DiscoveredUrl {
  url: string;
  kind: DiscoveredUrlKind;
  sourceHint?: 'sitemap' | 'platform-index' | 'nav-link' | 'spider';
}

export interface ExtractedProduct {
  sourceUrl: string;
  externalId?: string; // platform SKU / product id, if available
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  images: string[];
  availability?: 'in_stock' | 'out_of_stock' | 'unknown';
  variants?: Array<{
    id?: string;
    title: string;
    price?: number;
    sku?: string;
    available?: boolean;
  }>;
  contentHash?: string;
  raw?: Record<string, unknown>; // original JSON-LD / platform payload for audit
}

export interface ExtractedKnowledgeDoc {
  sourceUrl: string;
  category: 'policy' | 'faq' | 'general' | 'services' | 'pricing';
  title: string;
  markdown: string;
  contentHash?: string;
}

export interface CrawlJobData {
  businessId: string;
  domain: string; // e.g. "mystore.com" (no protocol)
}

export interface CrawlUrlJobData {
  businessId: string;
  domain: string;
  platform: PlatformType;
  discovered: DiscoveredUrl;
}
