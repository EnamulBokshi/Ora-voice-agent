import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';

export class UpdatePlatformAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  brandVoiceDescription?: string;

  @IsOptional()
  @IsString()
  @IsIn(['portfolio', 'agency_services', 'saas', 'ecommerce', 'clinic_appointments', 'consulting', 'general'])
  businessArchetype?: string;

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
