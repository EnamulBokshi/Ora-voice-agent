import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VectorIndex, VectorIndexDocument } from '../schemas/vector-index.schema';
import { EmbeddingService } from './embedding.service';
import { EntityType, SearchResultItem } from '../interfaces/vector-entry.interface';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectModel(VectorIndex.name)
    private readonly vectorIndexModel: Model<VectorIndexDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async upsertVector(
    businessId: string,
    entry: {
      entityType: EntityType;
      entityId: string;
      text: string;
      metadata?: Record<string, any>;
    },
  ): Promise<VectorIndexDocument> {
    const vector = await this.embeddingService.generateEmbedding(entry.text);

    const doc = await this.vectorIndexModel.findOneAndUpdate(
      {
        businessId: businessId as any,
        entityType: entry.entityType,
        entityId: entry.entityId,
      },
      {
        $set: {
          text: entry.text,
          vector,
          metadata: entry.metadata || {},
        },
      },
      { upsert: true, new: true },
    ).exec();

    return doc;
  }

  async searchVectors(
    businessId: string,
    queryVector: number[],
    options: {
      entityType?: EntityType;
      limit?: number;
      confidenceThreshold?: number;
    } = {},
  ): Promise<SearchResultItem[]> {
    const limit = options.limit || 5;
    const threshold = options.confidenceThreshold !== undefined ? options.confidenceThreshold : 0.65;

    const filter: Record<string, any> = {
      businessId: businessId as any,
    };

    if (options.entityType) {
      filter.entityType = options.entityType;
    }

    const candidateDocs = await this.vectorIndexModel.find(filter).exec();

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
        businessId: businessId as any,
        entityId,
      })
      .exec();
  }

  async deleteTenantVectors(businessId: string): Promise<void> {
    await this.vectorIndexModel
      .deleteMany({
        businessId: businessId as any,
      })
      .exec();
  }
}
