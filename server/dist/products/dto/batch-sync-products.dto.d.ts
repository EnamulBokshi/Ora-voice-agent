import { CreateProductDto } from './create-product.dto';
import { SourceTier } from '../schemas/product.schema';
export declare class BatchSyncProductsDto {
    sourceTier: SourceTier;
    products: CreateProductDto[];
}
