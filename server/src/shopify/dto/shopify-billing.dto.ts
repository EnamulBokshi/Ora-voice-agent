import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ShopifyBillingSubscribeDto {
  @IsString()
  @MaxLength(64)
  planId: string;

  /** Overrides where Shopify sends the merchant after they approve. */
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
