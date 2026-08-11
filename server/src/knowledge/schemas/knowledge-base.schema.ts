import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

export type KnowledgeBaseDocument = KnowledgeBase & Document;

export enum DocType {
  POLICY = 'policy',
  BRAND_RULE = 'brand_rule',
  FAQ = 'faq',
  SALES_PLAYBOOK = 'sales_playbook',
  UPLOADED_DOC = 'uploaded_doc',
  PRODUCT_MANUAL = 'product_manual',
}

@Schema({ timestamps: true })
export class KnowledgeBase {
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
    enum: Object.values(DocType),
    default: DocType.FAQ,
  })
  docType: DocType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ trim: true })
  sourceUrl?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const KnowledgeBaseSchema = SchemaFactory.createForClass(KnowledgeBase);
KnowledgeBaseSchema.index({ businessId: 1, title: 'text', content: 'text' });
