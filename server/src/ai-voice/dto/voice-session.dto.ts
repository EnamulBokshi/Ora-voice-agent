import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class BootstrapVoiceSessionDto {
  @IsString()
  @IsNotEmpty()
  publishableKey: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class ExecuteVoiceToolDto {
  @IsString()
  @IsOptional()
  publishableKey?: string;

  @IsString()
  @IsOptional()
  businessId?: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  toolName: string;

  @IsObject()
  @IsOptional()
  args?: Record<string, any>;
}
