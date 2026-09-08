import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DocType } from '../../knowledge/schemas/knowledge-base.schema';

/** Text document submitted as user input, mirroring the dashboard's create form. */
export class SubmitDocumentDto {
  @IsEnum(DocType)
  @IsNotEmpty()
  docType: DocType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200_000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  sourceUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
