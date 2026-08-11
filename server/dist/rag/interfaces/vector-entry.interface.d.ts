export declare enum EntityType {
    PRODUCT = "product",
    KNOWLEDGE_CHUNK = "knowledge_chunk"
}
export interface VectorEntry {
    id?: string;
    businessId: string;
    entityType: EntityType;
    entityId: string;
    text: string;
    vector: number[];
    metadata?: Record<string, any>;
    confidenceScore?: number;
}
export interface SearchResultItem {
    entityId: string;
    entityType: EntityType;
    text: string;
    score: number;
    metadata?: Record<string, any>;
    data?: any;
}
