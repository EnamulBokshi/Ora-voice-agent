import { IsOptional, IsString } from 'class-validator';

export class FileUploadDto {
  @IsOptional()
  @IsString()
  fieldMapping?: string; // JSON string of column→field mapping
}
