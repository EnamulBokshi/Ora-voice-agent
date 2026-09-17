import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AdminUser } from '../../users/schemas/admin-user.schema';

export type CouponDocument = Coupon & Document;

export enum CouponDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum CouponDuration {
  ONCE = 'once',
  FOREVER = 'forever',
  REPEATING = 'repeating',
}

export enum CouponCurrency {
  USD = 'USD',
  BDT = 'BDT',
  ALL = 'ALL',
}

@Schema({ timestamps: true })
export class Coupon {
  @Prop({
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  code: string;

  @Prop({ type: String, required: true, trim: true })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(CouponDiscountType),
    required: true,
  })
  discountType: CouponDiscountType;

  /**
   * Value of discount:
   * - If discountType is 'percentage', this is 1..100 (e.g. 20 for 20%).
   * - If discountType is 'fixed_amount', this is in smallest currency units (cents / paisa).
   */
  @Prop({ type: Number, required: true, min: 0 })
  discountAmount: number;

  @Prop({
    type: String,
    enum: Object.values(CouponCurrency),
    default: CouponCurrency.ALL,
  })
  currency: CouponCurrency;

  /**
   * Target plan IDs (e.g., ['growth', 'scale']). Empty array means applicable to all plans.
   */
  @Prop({ type: [String], default: [] })
  applicablePlans: string[];

  @Prop({
    type: String,
    enum: Object.values(CouponDuration),
    default: CouponDuration.ONCE,
  })
  duration: CouponDuration;

  @Prop({ type: Number, default: 0 })
  durationInMonths?: number;

  /**
   * Maximum redemptions allowed across the platform. Null or undefined means unlimited.
   */
  @Prop({ type: Number, default: null })
  maxRedemptions?: number | null;

  @Prop({ type: Number, default: 0 })
  redemptionsCount: number;

  /**
   * Maximum times a single business tenant can redeem this coupon.
   */
  @Prop({ type: Number, default: 1 })
  maxRedemptionsPerTenant: number;

  /**
   * Minimum plan cost required to apply coupon (in cents/paisa).
   */
  @Prop({ type: Number, default: 0 })
  minPlanPriceCents?: number;

  @Prop({ type: Date, default: Date.now })
  validFrom: Date;

  @Prop({ type: Date, default: null })
  validUntil?: Date | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: AdminUser.name,
    required: false,
  })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata?: Record<string, any>;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

// Helpful compound indexes
CouponSchema.index({ code: 1, isActive: 1 });
CouponSchema.index({ validFrom: 1, validUntil: 1 });
