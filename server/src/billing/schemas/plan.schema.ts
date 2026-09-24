import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PlanDocument = Plan & Document;

export enum PlanId {
  FREE = 'free',
  STARTER = 'starter',
  GROWTH = 'growth',
  SCALE = 'scale',
}

export class PlanLimits {
  /** Monthly live voice minutes allocation */
  @Prop({ type: Number, default: 500 })
  voiceMinutes: number;

  /** Maximum knowledge base documents / files uploaded */
  @Prop({ type: Number, default: 15 })
  documentLimit: number;

  /** Maximum number of verified connected websites / domains */
  @Prop({ type: Number, default: 1 })
  websiteLimit: number;

  /** Backwards compatibility alias for voiceMinutes */
  @Prop({ type: Number, default: 500 })
  conversationMinutes?: number;

  /** Backwards compatibility alias for websiteLimit */
  @Prop({ type: Number, default: 1 })
  connectedStores?: number;

  /** Backwards compatibility fallback */
  @Prop({ type: Number, default: 0 })
  ordersPerMonth?: number;

  /** Backwards compatibility fallback */
  @Prop({ type: Number, default: 1 })
  seats?: number;
}

@Schema({ timestamps: true })
export class Plan {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
  })
  planId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({ type: Number, required: true })
  priceUsdCents: number;

  @Prop({ type: Number, required: true })
  priceBdtPaisa: number;

  /** Interval of the stored prices. Always 'month'; the yearly price is derived. */
  @Prop({ default: 'month', trim: true })
  billingInterval: string;

  /**
   * Discount for paying yearly, in percent (0–90). The yearly price is
   * monthly × 12 × (1 − discount / 100); see utils/plan-pricing.util.ts.
   */
  @Prop({ type: Number, default: 0, min: 0, max: 90 })
  yearlyDiscountPercent: number;

  @Prop({
    type: {
      voiceMinutes: { type: Number, default: 500 },
      documentLimit: { type: Number, default: 15 },
      websiteLimit: { type: Number, default: 1 },
      conversationMinutes: { type: Number, default: 500 },
      connectedStores: { type: Number, default: 1 },
      ordersPerMonth: { type: Number, default: 0 },
      seats: { type: Number, default: 1 },
    },
    required: true,
  })
  limits: PlanLimits;

  @Prop({ type: [String], default: [] })
  features: string[];

  /**
   * Free-trial length in days (e.g. 14 days).
   */
  @Prop({ type: Number, default: 14 })
  trialDays: number;

  @Prop({ trim: true, default: '' })
  badge?: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Boolean, default: false })
  isCustom: boolean;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
