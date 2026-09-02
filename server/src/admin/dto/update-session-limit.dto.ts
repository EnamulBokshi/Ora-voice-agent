import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSessionLimitDto {
  /**
   * Session duration limit in seconds for all customer sessions under this merchant.
   * Min: 60 seconds (1 minute). Max: 3600 seconds (1 hour).
   * Pass null to revert to the platform-wide default (300s / 5 minutes).
   */
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(3600)
  sessionDurationSeconds: number | null;
}
