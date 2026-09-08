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

  @Prop({ type: String, unique: true, sparse: true, index: true, required: false })
  secretApiKey?: string | null;

  @Prop({
    type: String,
    enum: ['active', 'suspended', 'revoked', 'none'],
    default: 'active',
  })
  keyStatus?: string;

  /**
   * Merchant-level storefront widget visibility toggle.
   * When false, the widget does not mount or run on the merchant's business site.
   */
  @Prop({ type: Boolean, default: true })
  isWidgetActive: boolean;

  /**
   * Detected web origins and referrers using this publishable key.
   * Used for multi-site leak detection and domain mismatch telemetry.
   */
  @Prop({
    type: [
      {
        origin: { type: String, required: true },
        domain: { type: String, required: true },
        lastSeen: { type: Date, default: Date.now },
        sessionCount: { type: Number, default: 1 },
        isMismatch: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  detectedOrigins?: Array<{
    origin: string;
    domain: string;
    lastSeen: Date;
    sessionCount: number;
    isMismatch: boolean;
  }>;

  @Prop()
  keyRevokedAt?: Date;

  @Prop()
  keyRevokedBy?: string;

  @Prop()
  apiKeyHash?: string;

  @Prop({ select: false })
  apiSecretHash?: string;

  @Prop({ default: 'pending', enum: ['active', 'suspended', 'pending'] })
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

  /**
   * Monthly AI Token/Voice cost budget limit in USD (optional guardrail).
   * Null or 0 means unlimited/plan-default.
   */
  @Prop({ type: Number, default: null })
  monthlyAiBudgetUsd?: number | null;

  /**
   * Maximum allowed voice/chat session duration in seconds per customer session.
   * Null means use the platform-wide default (DEFAULT_SESSION_DURATION_SECONDS env var, defaults to 300s).
   * Set by SuperAdmin on a per-merchant basis. Range: 60–3600 seconds.
   */
  @Prop({ type: Number, default: null })
  maxSessionDurationSeconds?: number | null;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);

