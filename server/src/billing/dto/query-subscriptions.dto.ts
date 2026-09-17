import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  SubscriptionStatus,
  BillingProvider,
} from '../schemas/subscription.schema';

export class QuerySubscriptionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: SubscriptionStatus | 'all';

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  billingProvider?: BillingProvider | 'all';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
