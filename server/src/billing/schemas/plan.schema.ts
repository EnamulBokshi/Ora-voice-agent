import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PlanDocument = Plan & Document;

export enum PlanId {
  FREE = 'free',
  GROWTH = 'growth',
  SCALE = 'scale',
}

@Schema({ timestamps: true })
export class Plan {
  @Prop({
    type: String,
    required: true,
    unique: true,
    enum: Object.values(PlanId),
    index: true,
  })
  planId: PlanId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Number, required: true })
  priceUsdCents: number;

  @Prop({ type: Number, required: true })
  priceBdtPaisa: number;

  @Prop({ default: 'month', trim: true })
  billingInterval: string;

  @Prop({
    type: {
      conversationMinutes: { type: Number, default: 100 },
      ordersPerMonth: { type: Number, default: 20 },
      connectedStores: { type: Number, default: 1 },
      seats: { type: Number, default: 1 },
    },
    required: true,
  })
  limits: {
    conversationMinutes: number;
    ordersPerMonth: number;
    connectedStores: number;
    seats: number;
  };

  @Prop({ type: [String], default: [] })
  features: string[];

  /**
   * Free-trial length in days, passed to Shopify's `appSubscriptionCreate`.
   *
   * Shopify owns the trial: it starts the subscription ACTIVE and takes the
   * first payment `trialDays` later. Nothing in ORA counts it down, so this
   * value is the only thing that makes an advertised trial real. Zero means
   * the merchant is charged on approval.
   */
  @Prop({ type: Number, default: 0 })
  trialDays: number;

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
