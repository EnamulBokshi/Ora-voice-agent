export interface IngestionSummary {
  totalParsed: number;
  ingested: number;
  embedded: number;
  errors: string[];
  detectedMapping: Record<string, string>;
}

export interface FeedIngestPayload {
  feedUrl: string;
}

export interface FeedIngestResponse {
  totalParsed: number;
  ingested: number;
  embedded: number;
  errors?: string[];
}

export interface ManualIngestPayload {
  products: Array<{
    nativeProductId: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    availability?: string;
    stockQuantity?: number;
    images?: string[];
    category?: string;
    attributes?: Record<string, any>;
  }>;
  fieldMapping?: Record<string, string>;
}

export interface PlatformWebhookInfo {
  platform: 'shopify' | 'woocommerce';
  webhookUrl: string;
  events: string[];
  instructions: string;
}
