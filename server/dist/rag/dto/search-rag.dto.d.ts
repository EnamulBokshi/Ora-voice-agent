import { EntityType } from '../interfaces/vector-entry.interface';
export declare class SearchRagDto {
    query: string;
    entityType?: EntityType;
    limit?: number;
    confidenceThreshold?: number;
}
