import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Attributes of the profile that is currently live.
 *
 * The archetype is deliberately absent: it identifies the profile rather than
 * describing it, so it is changed through `POST /agent-config/archetype`,
 * which switches profiles instead of rewriting the current one.
 */
export class UpdateAgentConfigDto {
  @IsOptional()
  @IsString()
  brandVoiceDescription?: string;

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
