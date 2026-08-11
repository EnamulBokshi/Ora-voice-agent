import { Model, Types } from 'mongoose';
import { Product, ProductDocument, ProductAvailability } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { BatchSyncProductsDto } from './dto/batch-sync-products.dto';
export declare class ProductsService {
    private readonly productModel;
    constructor(productModel: Model<ProductDocument>);
    create(businessId: string, dto: CreateProductDto): Promise<ProductDocument>;
    findAll(businessId: string, query: QueryProductsDto): Promise<{
        items: (import("mongoose").Document<unknown, {}, ProductDocument, {}, import("mongoose").DefaultSchemaOptions> & Product & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(businessId: string, id: string): Promise<ProductDocument>;
    update(businessId: string, id: string, dto: UpdateProductDto): Promise<ProductDocument>;
    remove(businessId: string, id: string): Promise<{
        message: string;
    }>;
    batchSync(businessId: string, dto: BatchSyncProductsDto): Promise<{
        upsertedCount: number;
        modifiedCount: number;
        matchedCount: number;
    }>;
    verifyLive(businessId: string, id: string, liveData: {
        price?: number;
        stockQuantity?: number;
        availability?: ProductAvailability;
    }): Promise<ProductDocument>;
    incrementAgentMetrics(businessId: string, id: string, metric: 'recommended' | 'upsold'): Promise<(import("mongoose").Document<unknown, {}, ProductDocument, {}, import("mongoose").DefaultSchemaOptions> & Product & import("mongoose").Document<Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null>;
}
