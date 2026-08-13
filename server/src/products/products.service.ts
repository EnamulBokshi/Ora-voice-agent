import { Injectable, HttpStatus, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Product, ProductDocument, ProductAvailability, SourceTier } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductOverrideDto } from './dto/update-product-override.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { BatchSyncProductsDto } from './dto/batch-sync-products.dto';
import { DomainException } from '../common/exceptions/domain.exception';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly configService: ConfigService,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  async create(businessId: string, dto: CreateProductDto): Promise<ProductDocument> {
    const existing = await this.productModel
      .findOne({
        businessId: businessId as any,
        nativeProductId: dto.nativeProductId,
      })
      .exec();

    if (existing) {
      throw new DomainException(
        'PRODUCT_ALREADY_EXISTS',
        `Product with native ID '${dto.nativeProductId}' already exists in catalog.`,
        HttpStatus.CONFLICT,
      );
    }

    const product = new this.productModel({
      ...dto,
      businessId: new Types.ObjectId(businessId),
      lastVerifiedAt: new Date(),
    });

    return product.save();
  }

  async findAll(businessId: string, query: QueryProductsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      businessId: businessId as any,
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

  async findOne(businessId: string, id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!product) {
      throw new DomainException(
        'PRODUCT_NOT_FOUND',
        `Product with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return product;
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductDocument> {
    const product = await this.productModel
      .findOneAndUpdate(
        {
          _id: id as any,
          businessId: businessId as any,
        },
        {
          $set: {
            ...dto,
            lastVerifiedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (!product) {
      throw new DomainException(
        'PRODUCT_NOT_FOUND',
        `Product with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return product;
  }

  async manualOverride(
    businessId: string,
    id: string,
    dto: UpdateProductOverrideDto,
  ): Promise<ProductDocument> {
    const product = await this.findOne(businessId, id);

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.currency !== undefined) product.currency = dto.currency;
    if (dto.availability !== undefined) product.availability = dto.availability;
    if (dto.stockQuantity !== undefined) product.stockQuantity = dto.stockQuantity;
    if (dto.category !== undefined) product.category = dto.category;
    if (dto.attributes !== undefined) product.attributes = dto.attributes;

    product.sourceTier = SourceTier.TIER4_MANUAL;
    product.confidenceScore = 0.5;
    product.lastVerifiedAt = new Date();

    const saved = await product.save();

    // Invalidate Redis stock cache
    if (this.redisService) {
      const cacheKey = `live_stock:${businessId}:${id}`;
      this.redisService.getClient().del(cacheKey).catch(() => {});
    }

    return saved;
  }

  async remove(businessId: string, id: string): Promise<{ message: string }> {
    const result = await this.productModel
      .deleteOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new DomainException(
        'PRODUCT_NOT_FOUND',
        `Product with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return { message: 'Product deleted successfully.' };
  }

  async batchSync(businessId: string, dto: BatchSyncProductsDto) {
    const operations = dto.products.map((p) => ({
      updateOne: {
        filter: { businessId: businessId as any, nativeProductId: p.nativeProductId },
        update: {
          $set: {
            ...p,
            businessId: new Types.ObjectId(businessId),
            sourceTier: dto.sourceTier,
            lastVerifiedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await this.productModel.bulkWrite(operations as any);

    return {
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    };
  }

  async verifyLive(
    businessId: string,
    id: string,
    liveData?: {
      price?: number;
      stockQuantity?: number;
      availability?: ProductAvailability;
    },
  ) {
    const cacheKey = `live_stock:${businessId}:${id}`;

    // Check Redis Hot Cache if no explicit new liveData is supplied
    if (this.redisService && !liveData) {
      try {
        const cached = await this.redisService.getClient().get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const product = await this.findOne(businessId, id);
          return Object.assign(product.toObject(), {
            price: parsed.price,
            stockQuantity: parsed.stockQuantity,
            availability: parsed.availability,
            isLowStock: parsed.isLowStock,
          });
        }
      } catch (err) {
        // Cache miss or Redis bypass
      }
    }

    const product = await this.findOne(businessId, id);

    if (liveData) {
      if (liveData.price !== undefined) product.price = liveData.price;
      if (liveData.stockQuantity !== undefined)
        product.stockQuantity = liveData.stockQuantity;
      if (liveData.availability !== undefined)
        product.availability = liveData.availability;
    }

    product.lastVerifiedAt = new Date();
    product.confidenceScore = 1.0;

    const saved = await product.save();

    const lowStockThreshold = parseInt(
      this.configService.get<string>('LOW_STOCK_THRESHOLD') ?? '5',
      10,
    );
    const isLowStock =
      saved.availability === ProductAvailability.IN_STOCK &&
      saved.stockQuantity <= lowStockThreshold;

    // Cache updated stock and price in Redis with 15-minute TTL (EX 900)
    if (this.redisService) {
      const cacheValue = JSON.stringify({
        price: saved.price,
        stockQuantity: saved.stockQuantity,
        availability: saved.availability,
        isLowStock,
      });
      this.redisService.getClient().set(cacheKey, cacheValue, 'EX', 900).catch(() => {});
    }

    return Object.assign(saved, { isLowStock });
  }

  async incrementAgentMetrics(
    businessId: string,
    id: string,
    metric: 'recommended' | 'upsold',
  ) {
    const incField =
      metric === 'recommended'
        ? { timesRecommendedByAgent: 1 }
        : { timesUpsold: 1 };

    return this.productModel
      .findOneAndUpdate(
        {
          _id: id as any,
          businessId: businessId as any,
        },
        { $inc: incField },
        { new: true },
      )
      .exec();
  }
}
