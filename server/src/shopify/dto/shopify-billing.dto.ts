import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { BILLING_CYCLES, type BillingCycle } from '../../billing/utils/plan-pricing.util';

export class ShopifyBillingSubscribeDto {
  @IsString()
  @MaxLength(64)
  planId: string;

  /** Overrides where Shopify sends the merchant after they approve. */
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;

  @IsOptional()
  @IsIn(BILLING_CYCLES as unknown as string[])
  billingCycle?: BillingCycle = 'month';
}
