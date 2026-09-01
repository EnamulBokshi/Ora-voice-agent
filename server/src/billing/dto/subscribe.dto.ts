import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PlanId } from '../schemas/plan.schema';
import { BillingProvider } from '../schemas/subscription.schema';

export class SubscribeDto {
  @IsEnum(PlanId)
  @IsNotEmpty()
  planId: PlanId;

  @IsOptional()
  @IsEnum(BillingProvider)
  billingProvider?: BillingProvider = BillingProvider.STRIPE;
}
