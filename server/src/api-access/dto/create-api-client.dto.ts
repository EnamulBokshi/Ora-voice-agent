import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiScope } from '../schemas/api-client.schema';

export class CreateApiClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ApiScope, { each: true })
  scopes?: ApiScope[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];
}
