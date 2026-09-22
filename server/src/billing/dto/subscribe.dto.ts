import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PlanId } from '../schemas/plan.schema';
import { BillingProvider } from '../schemas/subscription.schema';

export class SubscribeDto {
  @IsEnum(PlanId)
  @IsNotEmpty()
  planId: PlanId;

  @IsOptional()
  @IsEnum(BillingProvider)
  billingProvider?: BillingProvider = BillingProvider.STRIPE;

  /**
   * Coupon code only. The discount itself is recomputed server-side from the stored
   * coupon, so a tampered request can change which coupon is tried, never its value.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;
}
