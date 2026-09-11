import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class VoiceTranscriptTurnDto {
  @IsIn(['merchant', 'ora'])
  speaker: 'merchant' | 'ora';

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}

import { DocType } from '../schemas/knowledge-base.schema';

export class IngestVoiceTranscriptDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => VoiceTranscriptTurnDto)
  turns: VoiceTranscriptTurnDto[];

  /** Voice-feed session this transcript came from, recorded on each document. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionId?: string;

  /** Optional target category: if set, guides classification toward this domain. */
  @IsOptional()
  @IsIn([...Object.values(DocType), 'all'])
  targetCategory?: DocType | 'all';
}
