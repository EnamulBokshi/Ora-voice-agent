import { IsNotEmpty, IsString } from 'class-validator';

export class CrawlStoreDto {
  @IsNotEmpty({ message: 'Store domain or website URL is required.' })
  @IsString()
  domain: string;
}
