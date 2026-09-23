import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/** A message a platform admin writes to one trial lead. */
export class TrialOutreachDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  /** Optional button target, e.g. a pricing page or a booking link. */
  @IsOptional()
  @IsUrl({ require_protocol: true })
  ctaUrl?: string;
}
