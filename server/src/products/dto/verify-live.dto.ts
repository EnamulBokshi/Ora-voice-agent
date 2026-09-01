import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ProductAvailability } from '../schemas/product.schema';

export class VerifyLiveDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsEnum(ProductAvailability)
  availability?: ProductAvailability;
}
