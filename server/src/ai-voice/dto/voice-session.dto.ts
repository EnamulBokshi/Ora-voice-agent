import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BootstrapVoiceSessionDto {
  @IsString()
  @IsNotEmpty()
  publishableKey: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
