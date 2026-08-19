import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject } from 'class-validator';

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
  headings?: HeadingItemDto[];

  @IsOptional()
  @IsArray()
  cards?: CardItemDto[];

  @IsOptional()
  @IsObject()
  contacts?: ContactChannelsDto;

  @IsOptional()
  @IsString()
  bodyTextSnippet?: string;

  @IsOptional()
  product?: {
    name?: string;
    price?: number;
    currency?: string;
    availability?: string;
    sku?: string;
  };

  @IsOptional()
  @IsString()
  contentHash?: string;
}
