import { IsNotEmpty, IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class PassiveIngestDto {
  @IsNotEmpty()
  @IsString()
  nativeProductId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}
