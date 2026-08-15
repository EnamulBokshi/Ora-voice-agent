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
  ) { }

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
      filter.category = { $regex: new RegExp(`^${query.category.trim()}$`, 'i') };
    }

    if (query.brand) {
      filter.brand = { $regex: new RegExp(`^${query.brand.trim()}$`, 'i') };
    }

    if (query.availability) {
      filter.availability = query.availability;
    }

    if (query.maxPrice !== undefined || query.minPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
      if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
    }

    if (query.search) {
      const trimmed = query.search.trim();

      // Conversational stop words to filter out of voice search queries
      const STOP_WORDS = new Set([
        'do', 'you', 'have', 'show', 'me', 'any', 'what', 'is', 'the', 'price', 'of',
        'can', 'i', 'get', 'for', 'in', 'store', 'stock', 'tell', 'about', 'looking',
        'need', 'want', 'please', 'give', 'check', 'available', 'product', 'products',
        'item', 'items', 'much', 'cost', 'buy', 'purchase', 'order', 'a', 'an', 'and', 'or',
        'some', 'with', 'under', 'category', 'find', 'which', 'shop',
      ]);

      const rawTerms = trimmed
        .split(/\s+/)
        .map((t) => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
        .filter(Boolean);

      const meaningfulTerms = rawTerms.filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
      const searchTerms = meaningfulTerms.length > 0 ? meaningfulTerms : rawTerms.filter((t) => t.length >= 2);

      // Dynamic Word-Boundary Regex Creator:
      // Prevents short words (like "ac", "fan", "ips", "led") from matching inside words like "Machine", "Pack", "Backup"
      const createDynamicRegex = (term: string) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use strict word boundary for tokens
        return new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
      };

      if (searchTerms.length > 0) {
        // Match products containing any of the search keywords as words or substrings
        filter.$or = searchTerms.flatMap((term) => {
          const wordRegex = createDynamicRegex(term);
          const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return [
            { name: { $regex: wordRegex } },
            { name: { $regex: escaped, $options: 'i' } },
            { category: { $regex: wordRegex } },
            { category: { $regex: escaped, $options: 'i' } },
            { brand: { $regex: wordRegex } },
            { description: { $regex: escaped, $options: 'i' } },
            { nativeProductId: { $regex: escaped, $options: 'i' } },
          ];
        });
      }
      // If search was general (e.g. "what products do you have"), we do not restrict filter.$or so all active store products are returned
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Math.max(limit * 3, 20)) // Fetch candidate pool for dynamic title-first re-ranking
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    // Dynamic Multi-Field Relevance Scoring:
    // Prioritizes items where the search terms appear in the Name / Title / Category over description substrings
    let rankedItems = items;
    if (query.search && items.length > 0) {
      const rawTerms = query.search
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((t) => t.length >= 2);

      if (rawTerms.length > 0) {
        rankedItems = items
          .map((item) => {
            let score = 0;
            const nameLower = (item.name || '').toLowerCase();
            const catLower = (item.category || '').toLowerCase();
            const brandLower = ((item as any).brand || '').toLowerCase();
            const descLower = (item.description || '').toLowerCase();

            for (const term of rawTerms) {
              if (nameLower.includes(term)) score += 10;
              if (catLower.includes(term)) score += 5;
              if (brandLower.includes(term)) score += 4;
              if (descLower.includes(term)) score += 2;
            }

            return { item, score };
          })
          .sort((a, b) => b.score - a.score)
          .map((ranked) => ranked.item)
          .slice(0, limit);
      } else {
        rankedItems = items.slice(0, limit);
      }
    } else {
      rankedItems = items.slice(0, limit);
    }

    return {
      items: rankedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(businessId: string, id: string): Promise<ProductDocument> {
    const isObjectId = Types.ObjectId.isValid(id) && id.length === 24;
    const query: any = {
      businessId: new Types.ObjectId(businessId),
    };
    if (isObjectId) {
      query.$or = [{ _id: new Types.ObjectId(id) }, { nativeProductId: id }];
    } else {
      query.nativeProductId = id;
    }

    const product = await this.productModel.findOne(query).exec();

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
      this.redisService.getClient().del(cacheKey).catch(() => { });
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
      this.redisService.getClient().set(cacheKey, cacheValue, 'EX', 900).catch(() => { });
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
