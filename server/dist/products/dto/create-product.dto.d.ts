import { ProductAvailability, SourceTier } from '../schemas/product.schema';
export declare class CreateProductDto {
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
