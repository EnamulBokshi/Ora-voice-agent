import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}
