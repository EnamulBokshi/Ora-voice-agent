import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Matches,
} from 'class-validator';
import {
  CouponDiscountType,
  CouponDuration,
  CouponCurrency,
} from '../schemas/coupon.schema';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]{3,30}$/, {
    message:
      'Coupon code must be 3-30 characters long and contain only uppercase letters, numbers, hyphens, and underscores.',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @IsNumber()
  @Min(1)
  discountAmount: number;

  @IsOptional()
  @IsEnum(CouponCurrency)
  currency?: CouponCurrency = CouponCurrency.ALL;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePlans?: string[] = [];

  @IsOptional()
  @IsEnum(CouponDuration)
  duration?: CouponDuration = CouponDuration.ONCE;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationInMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptions?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptionsPerTenant?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPlanPriceCents?: number = 0;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  metadata?: Record<string, any>;
}
