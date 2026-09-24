import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { BILLING_CYCLES, type BillingCycle } from '../utils/plan-pricing.util';
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

  /** Pay monthly or yearly. Yearly is charged up front at the discounted yearly price. */
  @IsOptional()
  @IsIn(BILLING_CYCLES as unknown as string[])
  billingCycle?: BillingCycle = 'month';
}
