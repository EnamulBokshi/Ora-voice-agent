import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { DocType } from '../schemas/knowledge-base.schema';

export class CreateKnowledgeDocDto {
  @IsEnum(DocType)
  @IsNotEmpty()
  docType: DocType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
