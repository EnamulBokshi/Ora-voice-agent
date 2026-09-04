import { IsString, IsOptional, IsBoolean } from 'class-validator';

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

  @IsString()
  @IsOptional()
  supportEmail?: string;

  @IsBoolean()
  @IsOptional()
  isWidgetActive?: boolean;
}
