export enum ProductAvailability {
  IN_STOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
  PREORDER = 'preorder',
  DISCONTINUED = 'discontinued',
}

export enum SourceTier {
  TIER1_CONNECTOR = 'tier1_connector',
  TIER2_FEED = 'tier2_feed',
  TIER3_PASSIVE = 'tier3_passive',
  TIER4_MANUAL = 'tier4_manual',
}

export interface ProductDocument {
  _id: string;
  businessId: string;
  nativeProductId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  availability: ProductAvailability;
  stockQuantity: number;
  images: string[];
  category?: string;
  attributes?: Record<string, any>;
  sourceTier: SourceTier;
  confidenceScore: number;
  isEmbedded?: boolean;
  embeddingRef?: string;
  lastVerifiedAt: string;
  isActive: boolean;
  timesRecommendedByAgent: number;
  timesUpsold: number;
  isLowStock?: boolean;
  urgencyHint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  availability?: ProductAvailability;
}

export interface ProductsResponseData {
  items: ProductDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateProductPayload {
  nativeProductId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  availability?: ProductAvailability;
  stockQuantity?: number;
  images?: string[];
  category?: string;
  attributes?: Record<string, any>;
  sourceTier?: SourceTier;
  confidenceScore?: number;
}

export interface UpdateProductOverridePayload {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  availability?: ProductAvailability;
  stockQuantity?: number;
  category?: string;
  attributes?: Record<string, any>;
}

export interface BatchSyncProductsPayload {
  products: CreateProductPayload[];
  sourceTier?: SourceTier;
}

export interface BatchSyncResponseData {
  upsertedCount: number;
  modifiedCount: number;
  matchedCount: number;
}

export interface VerifyLivePayload {
  price?: number;
  stockQuantity?: number;
  availability?: ProductAvailability;
}

export interface VerifyLiveResponse extends ProductDocument {
  isLowStock: boolean;
}
