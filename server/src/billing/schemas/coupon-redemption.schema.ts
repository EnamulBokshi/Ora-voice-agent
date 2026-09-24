import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { Coupon } from './coupon.schema';
import { BillingProvider } from './subscription.schema';

export type CouponRedemptionDocument = CouponRedemption & Document;

export enum CouponRedemptionStatus {
  /** Checkout started; the redemption slot is held but nothing is paid yet. */
  RESERVED = 'reserved',
  /** The gateway confirmed the discounted charge. */
  APPLIED = 'applied',
  /** Checkout failed or was abandoned; the slot went back to the pool. */
  RELEASED = 'released',
}

/**
 * One merchant's use of one coupon. This is the audit trail for a discount: the
 * amounts recorded here are the server's own arithmetic, never a client figure.
 */
@Schema({ timestamps: true })
export class CouponRedemption {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Coupon.name,
    required: true,
    index: true,
  })
  couponId: MongooseSchema.Types.ObjectId;

  /** Denormalized for reporting; the coupon document stays the source of truth. */
  @Prop({ required: true, uppercase: true, trim: true })
  code: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  planId: string;

  @Prop({ type: String, enum: Object.values(BillingProvider), required: true })
  billingProvider: BillingProvider;

  @Prop({ type: String, required: true })
  currency: string;

  /** Plan price before the discount, in minor units of `currency`. */
  @Prop({ type: Number, required: true })
  amountBeforeMinor: number;

  /** Discount applied, in minor units of `currency`. */
  @Prop({ type: Number, required: true })
  discountMinor: number;

  /** What the merchant is charged, in minor units of `currency`. */
  @Prop({ type: Number, required: true })
  amountAfterMinor: number;

  /** Cycle the amounts were priced for. Decides the period a gateway callback grants. */
  @Prop({ type: String, enum: ['month', 'year'], default: 'month' })
  billingCycle: 'month' | 'year';

  @Prop({
    type: String,
    enum: Object.values(CouponRedemptionStatus),
    default: CouponRedemptionStatus.RESERVED,
    index: true,
  })
  status: CouponRedemptionStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  subscriptionId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  transactionId: MongooseSchema.Types.ObjectId | null;

  /** Gateway reference this redemption was attached to, for webhook matching. */
  @Prop({ type: String, default: null, index: true })
  providerRef: string | null;
}

export const CouponRedemptionSchema = SchemaFactory.createForClass(CouponRedemption);

CouponRedemptionSchema.index({ couponId: 1, businessId: 1, status: 1 });
