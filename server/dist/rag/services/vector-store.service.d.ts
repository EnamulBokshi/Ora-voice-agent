import { Model } from 'mongoose';
import { VectorIndexDocument } from '../schemas/vector-index.schema';
import { EmbeddingService } from './embedding.service';
import { EntityType, SearchResultItem } from '../interfaces/vector-entry.interface';
export declare class VectorStoreService {
    private readonly vectorIndexModel;
    private readonly embeddingService;
    private readonly logger;
    constructor(vectorIndexModel: Model<VectorIndexDocument>, embeddingService: EmbeddingService);
    upsertVector(businessId: string, entry: {
        entityType: EntityType;
        entityId: string;
        text: string;
        metadata?: Record<string, any>;
    }): Promise<VectorIndexDocument>;
    searchVectors(businessId: string, queryVector: number[], options?: {
        entityType?: EntityType;
        limit?: number;
        confidenceThreshold?: number;
    }): Promise<SearchResultItem[]>;
    deleteVectorByEntityId(businessId: string, entityId: string): Promise<void>;
    deleteTenantVectors(businessId: string): Promise<void>;
}
