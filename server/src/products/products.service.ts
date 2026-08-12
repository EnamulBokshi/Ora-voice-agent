import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument, ProductAvailability } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { BatchSyncProductsDto } from './dto/batch-sync-products.dto';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
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

    return product.save();
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
