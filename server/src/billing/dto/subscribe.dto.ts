import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PlanId } from '../schemas/plan.schema';
import { BillingProvider } from '../schemas/subscription.schema';

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsOptional()
  @IsEnum(BillingProvider)
  billingProvider?: BillingProvider = BillingProvider.STRIPE;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
