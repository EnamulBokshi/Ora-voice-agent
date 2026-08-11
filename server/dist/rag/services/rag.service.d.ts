import { VectorStoreService } from './vector-store.service';
import { EmbeddingService } from './embedding.service';
import { ProductsService } from '../../products/products.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { SearchResultItem } from '../interfaces/vector-entry.interface';
export declare class RagService {
    private readonly vectorStoreService;
    private readonly embeddingService;
    private readonly productsService;
    private readonly knowledgeService;
    private readonly logger;
    constructor(vectorStoreService: VectorStoreService, embeddingService: EmbeddingService, productsService: ProductsService, knowledgeService: KnowledgeService);
    searchProducts(businessId: string, queryText: string, options?: {
        limit?: number;
        confidenceThreshold?: number;
    }): Promise<{
        query: string;
        fallbackTriggered: boolean;
        results: SearchResultItem[];
    }>;
    searchKnowledge(businessId: string, queryText: string, options?: {
        limit?: number;
        confidenceThreshold?: number;
    }): Promise<{
        query: string;
        results: SearchResultItem[];
    }>;
    searchCombined(businessId: string, queryText: string, options?: {
        limit?: number;
        confidenceThreshold?: number;
    }): Promise<{
        query: string;
        fallbackTriggered: boolean;
        products: SearchResultItem[];
        knowledge: SearchResultItem[];
    }>;
    reindexTenant(businessId: string): Promise<{
        message: string;
        indexedProducts: number;
        indexedChunks: number;
    }>;
}
