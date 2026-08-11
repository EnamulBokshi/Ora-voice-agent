"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const product_schema_1 = require("./schemas/product.schema");
const domain_exception_1 = require("../common/exceptions/domain.exception");
let ProductsService = class ProductsService {
    productModel;
    constructor(productModel) {
        this.productModel = productModel;
    }
    async create(businessId, dto) {
        const existing = await this.productModel
            .findOne({
            businessId: businessId,
            nativeProductId: dto.nativeProductId,
        })
            .exec();
        if (existing) {
            throw new domain_exception_1.DomainException('PRODUCT_ALREADY_EXISTS', `Product with native ID '${dto.nativeProductId}' already exists in catalog.`, common_1.HttpStatus.CONFLICT);
        }
        const product = new this.productModel({
            ...dto,
            businessId: new mongoose_2.Types.ObjectId(businessId),
            lastVerifiedAt: new Date(),
        });
        return product.save();
    }
    async findAll(businessId, query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const filter = {
            businessId: businessId,
            isActive: true,
        };
        if (query.category) {
            filter.category = query.category;
        }
        if (query.availability) {
            filter.availability = query.availability;
        }
        if (query.search) {
            filter.$or = [
                { name: { $regex: query.search, $options: 'i' } },
                { description: { $regex: query.search, $options: 'i' } },
                { category: { $regex: query.search, $options: 'i' } },
                { nativeProductId: { $regex: query.search, $options: 'i' } },
            ];
        }
        const [items, total] = await Promise.all([
            this.productModel
                .find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.productModel.countDocuments(filter).exec(),
        ]);
        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(businessId, id) {
        const product = await this.productModel
            .findOne({
            _id: id,
            businessId: businessId,
        })
            .exec();
        if (!product) {
            throw new domain_exception_1.DomainException('PRODUCT_NOT_FOUND', `Product with ID '${id}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        return product;
    }
    async update(businessId, id, dto) {
        const product = await this.productModel
            .findOneAndUpdate({
            _id: id,
            businessId: businessId,
        }, {
            $set: {
                ...dto,
                lastVerifiedAt: new Date(),
            },
        }, { new: true })
            .exec();
        if (!product) {
            throw new domain_exception_1.DomainException('PRODUCT_NOT_FOUND', `Product with ID '${id}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        return product;
    }
    async remove(businessId, id) {
        const result = await this.productModel
            .deleteOne({
            _id: id,
            businessId: businessId,
        })
            .exec();
        if (result.deletedCount === 0) {
            throw new domain_exception_1.DomainException('PRODUCT_NOT_FOUND', `Product with ID '${id}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        return { message: 'Product deleted successfully.' };
    }
    async batchSync(businessId, dto) {
        const operations = dto.products.map((p) => ({
            updateOne: {
                filter: { businessId: businessId, nativeProductId: p.nativeProductId },
                update: {
                    $set: {
                        ...p,
                        businessId: new mongoose_2.Types.ObjectId(businessId),
                        sourceTier: dto.sourceTier,
                        lastVerifiedAt: new Date(),
                    },
                },
                upsert: true,
            },
        }));
        const result = await this.productModel.bulkWrite(operations);
        return {
            upsertedCount: result.upsertedCount,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount,
        };
    }
    async verifyLive(businessId, id, liveData) {
        const product = await this.findOne(businessId, id);
        if (liveData.price !== undefined)
            product.price = liveData.price;
        if (liveData.stockQuantity !== undefined)
            product.stockQuantity = liveData.stockQuantity;
        if (liveData.availability !== undefined)
            product.availability = liveData.availability;
        product.lastVerifiedAt = new Date();
        product.confidenceScore = 1.0;
        return product.save();
    }
    async incrementAgentMetrics(businessId, id, metric) {
        const incField = metric === 'recommended'
            ? { timesRecommendedByAgent: 1 }
            : { timesUpsold: 1 };
        return this.productModel
            .findOneAndUpdate({
            _id: id,
            businessId: businessId,
        }, { $inc: incField }, { new: true })
            .exec();
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ProductsService);
//# sourceMappingURL=products.service.js.map