import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateAgentConfigDto {
  @IsOptional()
  @IsString()
  brandVoiceDescription?: string;

  @IsOptional()
  @IsString()
  businessArchetype?: string;

  @IsOptional()
  @IsString()
  businessSummary?: string;

  @IsOptional()
  @IsString()
  customDirectives?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  greetingMessage?: string;

  @IsOptional()
  @IsString()
  avoidances?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  idleTimeoutSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  discountFloorPercent?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alwaysOfferProductIds?: string[];

  @IsOptional()
  @IsString()
  voiceId?: string;

  @IsOptional()
  @IsObject()
  upsellCategories?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  mentionLowStockUrgency?: boolean;
}
