import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

export type SubscriptionDocument = Subscription & Document;

export enum BillingProvider {
  STRIPE = 'stripe',
  BKASH = 'bkash',
  /**
   * Shopify App Billing. Shopify requires app subscriptions sold to its
   * merchants to be charged through `appSubscriptionCreate`, so a Shopify
   * tenant never reaches Stripe or bKash. Renewal is Shopify's job, which is
   * why the bKash renewal scheduler must skip this provider.
   */
  SHOPIFY = 'shopify',
}

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  planId: string;

  @Prop({
    type: String,
    enum: Object.values(BillingProvider),
    default: BillingProvider.STRIPE,
  })
  billingProvider: BillingProvider;

  @Prop({ trim: true })
  providerRef?: string;

  @Prop({
    type: String,
    enum: Object.values(SubscriptionStatus),
    default: SubscriptionStatus.ACTIVE,
    index: true,
  })
  status: SubscriptionStatus;

  @Prop({ default: Date.now })
  currentPeriodStart: Date;

  @Prop({ required: true })
  currentPeriodEnd: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;

  @Prop({
    type: {
      couponId: { type: MongooseSchema.Types.ObjectId, ref: 'Coupon' },
      code: { type: String, uppercase: true, trim: true },
      discountType: { type: String },
      discountAmount: { type: Number },
      appliedAt: { type: Date, default: Date.now },
    },
    default: null,
  })
  appliedCoupon?: {
    couponId?: MongooseSchema.Types.ObjectId;
    code: string;
    discountType: string;
    discountAmount: number;
    appliedAt: Date;
  } | null;

  @Prop({ trim: true, default: '' })
  adminNotes?: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
