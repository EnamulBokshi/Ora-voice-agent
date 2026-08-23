import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class HeadingItemDto {
  @IsString()
  level: string;

  @IsString()
  text: string;
}

export class CardItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  link?: string;
}

export class ContactChannelsDto {
  @IsOptional()
  @IsArray()
  emails?: string[];

  @IsOptional()
  @IsArray()
  links?: string[];
}

export class ProductTelemetryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class DomTelemetryDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  pathname?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HeadingItemDto)
  headings?: HeadingItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardItemDto)
  cards?: CardItemDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContactChannelsDto)
  contacts?: ContactChannelsDto;

  @IsOptional()
  @IsString()
  bodyTextSnippet?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProductTelemetryDto)
  product?: ProductTelemetryDto;

  @IsOptional()
  @IsString()
  contentHash?: string;
}
