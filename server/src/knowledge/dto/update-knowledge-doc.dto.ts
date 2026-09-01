import { PartialType } from '@nestjs/mapped-types';
import { CreateKnowledgeDocDto } from './create-knowledge-doc.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateKnowledgeDocDto extends PartialType(CreateKnowledgeDocDto) {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
