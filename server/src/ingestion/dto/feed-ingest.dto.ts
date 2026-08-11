import { IsNotEmpty, IsUrl, IsOptional, IsString } from 'class-validator';

export class FeedIngestDto {
  @IsNotEmpty()
  @IsUrl()
  feedUrl: string;

  @IsOptional()
  @IsString()
  format?: 'xml' | 'csv' | 'json' = 'xml';
}
