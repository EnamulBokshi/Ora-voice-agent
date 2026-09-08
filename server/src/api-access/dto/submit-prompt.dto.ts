import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * A single end-user prompt captured from an external channel.
 *
 * Note there is no businessId field: the tenant is resolved from the access
 * token. Because the global ValidationPipe runs with forbidNonWhitelisted,
 * a caller that tries to send one gets a 400 rather than silent acceptance.
 */
export class SubmitPromptDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  prompt: string;

  /**
   * Caller-supplied conversation/thread key. Scoped to the client's tenant,
   * so two tenants may use the same value without colliding.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;

  /** Opaque end-user identifier in the caller's own system. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalUserId?: string;

  /**
   * Caller-supplied idempotency key (e.g. the upstream message id). Repeat
   * deliveries with the same key return the original record instead of
   * creating a duplicate.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
