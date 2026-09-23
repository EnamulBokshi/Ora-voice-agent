import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CouponDiscountType } from '../schemas/coupon.schema';
import { PlanId } from '../schemas/plan.schema';
import { BillingProvider } from '../schemas/subscription.schema';

/** What a merchant sends to price a coupon before paying. Never an amount. */
export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @IsEnum(PlanId)
  planId: PlanId;

  @IsOptional()
  @IsEnum(BillingProvider)
  billingProvider?: BillingProvider = BillingProvider.STRIPE;
}

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountOffUsdCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountOffBdtPaisa?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToPlanIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptionsPerBusiness?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Same shape minus `code`, which is immutable once redemptions exist. */
export class UpdateCouponDto {
  @IsOptional()
  @IsEnum(CouponDiscountType)
  discountType?: CouponDiscountType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountOffUsdCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountOffBdtPaisa?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToPlanIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptionsPerBusiness?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
