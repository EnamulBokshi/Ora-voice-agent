import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Coupon } from './coupon.schema';
import { Business } from '../../users/schemas/business.schema';
import { AdminUser } from '../../users/schemas/admin-user.schema';
import { Subscription } from './subscription.schema';

export type CouponRedemptionDocument = CouponRedemption & Document;

@Schema({ timestamps: true })
export class CouponRedemption {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Coupon.name,
    required: true,
    index: true,
  })
  couponId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  couponCode: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: AdminUser.name,
    required: false,
  })
  adminUserId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Subscription.name,
    required: false,
    index: true,
  })
  subscriptionId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  planId: string;

  @Prop({ type: Number, required: true })
  originalAmount: number;

  @Prop({ type: Number, required: true })
  discountAmount: number;

  @Prop({ type: Number, required: true })
  finalAmount: number;

  @Prop({ type: String, required: true, default: 'USD' })
  currency: string;

  @Prop({ type: Date, default: Date.now, index: true })
  redeemedAt: Date;
}

export const CouponRedemptionSchema =
  SchemaFactory.createForClass(CouponRedemption);

CouponRedemptionSchema.index({ couponId: 1, businessId: 1 });
CouponRedemptionSchema.index({ couponCode: 1, redeemedAt: -1 });
