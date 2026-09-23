import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AdminUser } from '../../users/schemas/admin-user.schema';

export type CouponDocument = Coupon & Document;

export enum CouponDiscountType {
  /** A percentage taken off the plan price, in whole percent. */
  PERCENT = 'percent',
  /** A flat amount taken off, carried per currency in minor units. */
  FIXED = 'fixed',
}

/**
 * A discount a merchant can apply at checkout.
 *
 * Every field that decides the price lives here and nowhere else: the client sends
 * a code and never an amount, and the server recomputes the discount from this
 * document on each validate and each subscribe.
 */
@Schema({ timestamps: true })
export class Coupon {
  /**
   * Normalized to upper case on write, so `SAVE20` and `save20` are one coupon and
   * the unique index cannot be bypassed by casing.
   */
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code: string;

  @Prop({ type: String, enum: Object.values(CouponDiscountType), required: true })
  discountType: CouponDiscountType;

  /**
   * 1–100 when discountType is 'percent'.
   *
   * The floor is 0, not 1: a fixed coupon stores 0 here to say "unused", which is what
   * CouponService writes when it normalizes the discount fields. A `min: 1` bound
   * rejected that write, so no fixed coupon could be created at all. The real 1–100
   * range for a percentage coupon is enforced by CreateCouponDto and assertCoherent.
   */
  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  percentOff: number;

  /** Flat discount in USD cents. Used only when discountType is 'fixed'. */
  @Prop({ type: Number, min: 0, default: 0 })
  amountOffUsdCents: number;

  /** Flat discount in BDT paisa. Used only when discountType is 'fixed'. */
  @Prop({ type: Number, min: 0, default: 0 })
  amountOffBdtPaisa: number;

  /** Empty means the coupon applies to every paid plan. */
  @Prop({ type: [String], default: [] })
  appliesToPlanIds: string[];

  /** Null means unlimited total redemptions. */
  @Prop({ type: Number, default: null })
  maxRedemptions: number | null;

  /** Incremented atomically when a checkout reserves the coupon. */
  @Prop({ type: Number, default: 0, min: 0 })
  redeemedCount: number;

  /** How many times one tenant may redeem this code. */
  @Prop({ type: Number, default: 1, min: 1 })
  maxRedemptionsPerBusiness: number;

  @Prop({ type: Date, default: null })
  validFrom: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  /** Internal note for the admin console; never returned to merchants. */
  @Prop({ type: String, default: '', trim: true })
  notes: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: AdminUser.name,
    default: null,
  })
  createdBy: MongooseSchema.Types.ObjectId | null;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
