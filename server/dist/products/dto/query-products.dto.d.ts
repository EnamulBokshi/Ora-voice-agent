import { ProductAvailability } from '../schemas/product.schema';
export declare class QueryProductsDto {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    availability?: ProductAvailability;
}
