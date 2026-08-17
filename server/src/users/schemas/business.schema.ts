import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BusinessDocument = Business & Document;

@Schema({ timestamps: true })
export class Business {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  domain?: string;

  @Prop({ type: String, unique: true, sparse: true, index: true, required: false })
  publishableKey?: string | null;

  @Prop()
  apiKeyHash?: string;

  @Prop({ default: 'active', enum: ['active', 'suspended', 'pending'] })
  status: string;

  /**
   * Which platform the merchant's product catalog is connected to.
   * Used by the RAG Gap B live fallback to determine which connector to call.
   */
  @Prop({
    type: String,
    enum: ['shopify', 'woocommerce', 'feed', 'passive', 'manual', 'none'],
    default: 'none',
  })
  connectedPlatform: string;

  // --- Tier 1: Shopify Connector ---
  @Prop({ trim: true })
  shopifyStoreUrl?: string;

  @Prop({ trim: true })
  shopifyAccessToken?: string;

  // --- Tier 1: WooCommerce Connector ---
  @Prop({ trim: true })
  woocommerceStoreUrl?: string;

  @Prop({ trim: true })
  woocommerceConsumerKey?: string;

  @Prop({ trim: true })
  woocommerceConsumerSecret?: string;

  // --- Tier 4: Manual Endpoint Connector ---
  @Prop({ trim: true })
  manualEndpointUrl?: string;

  @Prop({
    type: String,
    enum: ['id_lookup', 'search_only'],
    default: 'search_only',
  })
  manualEndpointMode?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  manualEndpointHeaders?: Record<string, string>;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);

