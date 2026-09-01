export enum VectorEntityType {
  PRODUCT = 'product',
  KNOWLEDGE_CHUNK = 'knowledge_chunk',
}

export interface SearchRagDto {
  query: string;
  entityType?: VectorEntityType;
  limit?: number;
  confidenceThreshold?: number;
}

export interface SearchResultItem {
  entityId: string;
  entityType: VectorEntityType;
  text: string;
  score: number;
  metadata?: Record<string, any>;
  data?: any;
}

export interface RagSearchProductsResponse {
  query: string;
  fallbackTriggered: boolean;
  results: SearchResultItem[];
}

export interface RagSearchKnowledgeResponse {
  query: string;
  results: SearchResultItem[];
}

export interface RagCombinedResponse {
  query: string;
  fallbackTriggered: boolean;
  products: SearchResultItem[];
  knowledge: SearchResultItem[];
}

export interface ReindexTenantResponse {
  message: string;
  indexedProducts: number;
  indexedChunks: number;
}
