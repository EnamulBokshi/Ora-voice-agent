import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VectorIndex, VectorIndexDocument } from './schemas/vector-index.schema';
import { EmbeddingService } from './embedding.service';
import { EntityType, SearchResultItem } from './interfaces/vector-entry.interface';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectModel(VectorIndex.name)
    private readonly vectorIndexModel: Model<VectorIndexDocument>,
    private readonly embeddingService: EmbeddingService,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  private resolveBusinessIdFilter(businessId: string): any {
    if (Types.ObjectId.isValid(businessId)) {
      return { $in: [new Types.ObjectId(businessId), String(businessId)] };
    }
    return businessId;
  }

  async upsertVector(
    businessId: string,
    entry: {
      entityType: EntityType;
      entityId: string;
      text: string;
      /**
       * Set for entities scoped to one agent profile (knowledge). Left unset
       * for entities the business shares across every profile (products).
       */
      archetype?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<VectorIndexDocument> {
    const embeddingResult = await this.embeddingService.generateEmbedding(entry.text);
    const bId = Types.ObjectId.isValid(businessId) ? new Types.ObjectId(businessId) : businessId;

    const doc = await this.vectorIndexModel.findOneAndUpdate(
      {
        businessId: this.resolveBusinessIdFilter(businessId),
        entityType: entry.entityType,
        entityId: entry.entityId,
      },
      {
        $set: {
          businessId: bId,
          ...(entry.archetype ? { archetype: entry.archetype } : {}),
          text: entry.text,
          vector: embeddingResult.vector,
          metadata: entry.metadata || {},
          embeddingModel: embeddingResult.embeddingModel,
          embeddingVersion: embeddingResult.embeddingVersion,
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).exec();

    // Mark the source product as embedded so the dashboard can distinguish
    // embedded vs pending products.
    if (entry.entityType === EntityType.PRODUCT) {
      this.productModel
        .findByIdAndUpdate(entry.entityId, { $set: { isEmbedded: true } })
        .exec()
        .catch((err) =>
          this.logger.warn(`Failed to mark product ${entry.entityId} as embedded: ${err.message}`),
        );
    }

    return doc;
  }

  async upsertBatchVectors(
    businessId: string,
    entries: Array<{
      entityType: EntityType;
      entityId: string;
      text: string;
      archetype?: string;
      metadata?: Record<string, any>;
    }>,
  ): Promise<void> {
    if (entries.length === 0) return;

    const texts = entries.map((e) => e.text);
    const embeddingResults = await this.embeddingService.generateBatchEmbeddings(texts);
    const bId = Types.ObjectId.isValid(businessId) ? new Types.ObjectId(businessId) : businessId;

    const operations = entries.map((entry, idx) => {
      const emb = embeddingResults[idx];
      return {
        updateOne: {
          filter: {
            businessId: this.resolveBusinessIdFilter(businessId),
            entityType: entry.entityType,
            entityId: entry.entityId,
          },
          update: {
            $set: {
              businessId: bId,
              ...(entry.archetype ? { archetype: entry.archetype } : {}),
              text: entry.text,
              vector: emb.vector,
              metadata: entry.metadata || {},
              embeddingModel: emb.embeddingModel,
              embeddingVersion: emb.embeddingVersion,
            },
          },
          upsert: true,
        },
      };
    });

    await this.vectorIndexModel.bulkWrite(operations as any);

    // Mark products as embedded
    const productEntityIds = entries
      .filter((e) => e.entityType === EntityType.PRODUCT)
      .map((e) => e.entityId);

    if (productEntityIds.length > 0) {
      this.productModel
        .updateMany(
          { _id: { $in: productEntityIds } },
          { $set: { isEmbedded: true } },
        )
        .exec()
        .catch((err) =>
          this.logger.warn(`Failed to mark bulk products as embedded: ${err.message}`),
        );
    }
  }

  async searchVectors(
    businessId: string,
    queryVector: number[],
    options: {
      entityType?: EntityType;
      limit?: number;
      confidenceThreshold?: number;
      embeddingModel?: string;
      /**
       * The agent profile to search within. Rows with no archetype are shared
       * across profiles (products) and always match, so passing this narrows
       * knowledge to one profile without hiding the merchant's catalogue.
       */
      archetype?: string;
    } = {},
  ): Promise<SearchResultItem[]> {
    const limit = options.limit || 5;
    const threshold = options.confidenceThreshold !== undefined ? options.confidenceThreshold : 0.50;
    const activeModel = options.embeddingModel || this.embeddingService.getActiveModelName();

    const filter: Record<string, any> = {
      businessId: this.resolveBusinessIdFilter(businessId),
      $and: [
        {
          $or: [
            { embeddingModel: activeModel },
            { embeddingModel: { $exists: false } },
          ],
        },
      ],
    };

    if (options.archetype) {
      filter.$and.push({
        $or: [
          { archetype: options.archetype },
          { archetype: { $exists: false } },
          { archetype: null },
        ],
      });
    }

    if (options.entityType) {
      filter.entityType = options.entityType;
    }

    const candidateDocs = await this.vectorIndexModel
      .find(filter)
      .select('entityId entityType text vector metadata')
      .lean()
      .exec();

    const scored = candidateDocs
      .map((doc) => {
        const score = this.embeddingService.cosineSimilarity(
          queryVector,
          doc.vector,
        );
        return {
          entityId: doc.entityId,
          entityType: doc.entityType,
          text: doc.text,
          score,
          metadata: doc.metadata,
        };
      })
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  async deleteVectorByEntityId(
    businessId: string,
    entityId: string,
  ): Promise<void> {
    await this.vectorIndexModel
      .deleteMany({
        businessId: this.resolveBusinessIdFilter(businessId),
        entityId,
      })
      .exec();
  }

  async deleteTenantVectors(businessId: string): Promise<void> {
    await this.vectorIndexModel
      .deleteMany({
        businessId: this.resolveBusinessIdFilter(businessId),
      })
      .exec();
  }
}
