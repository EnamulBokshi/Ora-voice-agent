import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';
import { BUSINESS_ARCHETYPES } from '../../common/constants/archetypes';

export class UpdatePlatformAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  brandVoiceDescription?: string;

  /**
   * Switches which profile the platform agent runs. Like every other tenant,
   * the platform keeps one profile per archetype; changing this swaps them
   * rather than rewriting the live one.
   */
  @IsOptional()
  @IsString()
  @IsIn(BUSINESS_ARCHETYPES as unknown as string[])
  archetype?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  businessSummary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  customDirectives?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
