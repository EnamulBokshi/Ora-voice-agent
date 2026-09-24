import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class BootstrapVoiceSessionDto {
  @IsString()
  @IsNotEmpty()
  publishableKey: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class IssueVoiceTicketDto {
  @IsIn(['test', 'training', 'visitor'])
  mode: 'test' | 'training' | 'visitor';
}
