import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { KnowledgeBase } from './knowledge-base.schema';

export type KnowledgeChunkDocument = KnowledgeChunk & Document;

@Schema({ timestamps: true })
export class KnowledgeChunk {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: KnowledgeBase.name,
    required: true,
    index: true,
  })
  knowledgeBaseId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true, type: Number })
  chunkIndex: number;

  @Prop()
  embeddingRef?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: false })
  isEmbedded: boolean;
}

export const KnowledgeChunkSchema = SchemaFactory.createForClass(KnowledgeChunk);
KnowledgeChunkSchema.index({ businessId: 1, knowledgeBaseId: 1 });
