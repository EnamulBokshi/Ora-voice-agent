import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlanLimitsDto {
  @IsNumber()
  @Min(0)
  conversationMinutes: number;

  @IsNumber()
  @Min(0)
  ordersPerMonth: number;

  @IsNumber()
  @Min(0)
  connectedStores: number;

  @IsNumber()
  @Min(1)
  seats: number;
}

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  priceUsdCents: number;

  @IsNumber()
  @Min(0)
  priceBdtPaisa: number;

  @IsOptional()
  @IsString()
  billingInterval?: string = 'month';

  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits: PlanLimitsDto;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  trialDays?: number = 0;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isCustom?: boolean = false;
}
