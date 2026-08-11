import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { BatchSyncProductsDto } from './dto/batch-sync-products.dto';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { ProductAvailability } from './schemas/product.schema';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(user: JwtPayloadUser, dto: CreateProductDto): Promise<import("./schemas/product.schema").ProductDocument>;
    findAll(user: JwtPayloadUser, query: QueryProductsDto): Promise<{
        items: (import("mongoose").Document<unknown, {}, import("./schemas/product.schema").ProductDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/product.schema").Product & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
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
    findOne(user: JwtPayloadUser, id: string): Promise<import("./schemas/product.schema").ProductDocument>;
    update(user: JwtPayloadUser, id: string, dto: UpdateProductDto): Promise<import("./schemas/product.schema").ProductDocument>;
    remove(user: JwtPayloadUser, id: string): Promise<{
        message: string;
    }>;
    batchSync(user: JwtPayloadUser, dto: BatchSyncProductsDto): Promise<{
        upsertedCount: number;
        modifiedCount: number;
        matchedCount: number;
    }>;
    verifyLive(user: JwtPayloadUser, id: string, liveData: {
        price?: number;
        stockQuantity?: number;
        availability?: ProductAvailability;
    }): Promise<import("./schemas/product.schema").ProductDocument>;
}
