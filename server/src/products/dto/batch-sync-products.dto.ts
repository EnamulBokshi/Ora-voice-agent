import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { SourceTier } from '../schemas/product.schema';

export class BatchSyncProductsDto {
  @IsNotEmpty()
  @IsEnum(SourceTier)
  sourceTier: SourceTier;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products: CreateProductDto[];
}
