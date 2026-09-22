import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export const CAMPAIGN_AUDIENCES = [
  'all_merchants',
  'active_merchants',
  'pending_merchants',
] as const;

/** A promotional send: either an explicit list of tenants, or a named audience. */
export class SendCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  /** Advertised coupon. Verified against the catalogue before the send. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  ctaUrl?: string;

  /** Explicit recipients. Takes precedence over `audience`. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  businessIds?: string[];

  @IsOptional()
  @IsIn(CAMPAIGN_AUDIENCES as unknown as string[])
  audience?: string;
}

export class PreviewAudienceDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  businessIds?: string[];

  @IsOptional()
  @IsIn(CAMPAIGN_AUDIENCES as unknown as string[])
  audience?: string;
}
