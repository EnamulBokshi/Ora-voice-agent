import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUserQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['all', 'super_admin', 'owner', 'admin', 'staff', 'user'])
  role?: string = 'all';

  @IsOptional()
  @IsString()
  @IsIn(['all', 'subscriber', 'growth', 'scale', 'free'])
  plan?: string = 'all';

  @IsOptional()
  @IsString()
  @IsIn(['all', 'active', 'suspended', 'unverified'])
  status?: string = 'all';

  @IsOptional()
  @IsString()
  @IsIn(['all', 'stripe', 'bkash'])
  billingProvider?: string = 'all';

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'name', 'email'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
