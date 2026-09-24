import { IsString, IsOptional, IsBoolean, IsEmail, ValidateIf } from 'class-validator';

export class UpdateBusinessDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  shopifyStoreUrl?: string;

  @IsString()
  @IsOptional()
  woocommerceStoreUrl?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  /** An empty string clears it. */
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail({}, { message: 'supportEmail must be a valid email address.' })
  supportEmail?: string;

  @IsBoolean()
  @IsOptional()
  isWidgetActive?: boolean;
}
