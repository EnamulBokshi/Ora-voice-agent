import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

export type ProductDocument = Product & Document;

export enum ProductAvailability {
  IN_STOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
  PREORDER = 'preorder',
  DISCONTINUED = 'discontinued',
}

export enum SourceTier {
  TIER1_CONNECTOR = 'tier1_connector',
  TIER2_FEED = 'tier2_feed',
  TIER3_PASSIVE = 'tier3_passive',
  TIER4_MANUAL = 'tier4_manual',
}

@Schema({ timestamps: true })
export class Product {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  nativeProductId: string;

  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ default: 'USD', trim: true })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(ProductAvailability),
    default: ProductAvailability.IN_STOCK,
  })
  availability: ProductAvailability;

  @Prop({ type: Number, default: 0 })
  stockQuantity: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ trim: true, index: true })
  category?: string;

  /**
   * Manufacturer or vendor, e.g. Shopify's `vendor`. Filterable through the
   * `brand` query parameter and scored by product search.
   */
  @Prop({ trim: true, index: true })
  brand?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  attributes: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(SourceTier),
    default: SourceTier.TIER1_CONNECTOR,
  })
  sourceTier: SourceTier;

  @Prop({ type: Number, default: 1.0, min: 0.0, max: 1.0 })
  confidenceScore: number;

  @Prop({ default: Date.now })
  lastVerifiedAt: Date;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmbedded: boolean;

  @Prop({ type: Number, default: 0 })
  timesRecommendedByAgent: number;

  @Prop({ type: Number, default: 0 })
  timesUpsold: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ businessId: 1, nativeProductId: 1 }, { unique: true });
ProductSchema.index({ businessId: 1, name: 'text', description: 'text', category: 'text' });
