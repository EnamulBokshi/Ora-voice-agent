import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { EntityType } from '../interfaces/vector-entry.interface';

export type VectorIndexDocument = VectorIndex & Document;

@Schema({ timestamps: true })
export class VectorIndex {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(EntityType),
    index: true,
  })
  entityType: EntityType;

  @Prop({ required: true, index: true })
  entityId: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: [Number], required: true })
  vector: number[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  /**
   * The model name used to generate the vector (e.g. "text-embedding-004" or "fallback-term-hash").
   * Set on every write — allows detection of stale vectors after a model upgrade.
   */
  @Prop({ trim: true })
  embeddingModel?: string;

  /**
   * A short version tag (e.g. "gemini-v1" or "deterministic-v1") to further qualify the model.
   */
  @Prop({ trim: true })
  embeddingVersion?: string;
}

export const VectorIndexSchema = SchemaFactory.createForClass(VectorIndex);
VectorIndexSchema.index({ businessId: 1, entityType: 1, entityId: 1 }, { unique: true });
