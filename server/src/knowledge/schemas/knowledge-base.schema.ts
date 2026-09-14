import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { BUSINESS_ARCHETYPES, DEFAULT_ARCHETYPE } from '../../common/constants/archetypes';

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

  /**
   * The agent profile this row belongs to. Knowledge is scoped per archetype,
   * so switching a business to a different archetype presents a fresh, empty
   * knowledge set while the previous one stays intact behind the old profile.
   */
  @Prop({
    type: String,
    enum: BUSINESS_ARCHETYPES,
    default: DEFAULT_ARCHETYPE,
    required: true,
    index: true,
  })
  archetype: string;

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

  @Prop({ default: false, index: true })
  isEmbedded: boolean;
}

export const KnowledgeBaseSchema = SchemaFactory.createForClass(KnowledgeBase);
KnowledgeBaseSchema.index({ businessId: 1, archetype: 1, isActive: 1 });
KnowledgeBaseSchema.index({ businessId: 1, title: 'text', content: 'text' });
