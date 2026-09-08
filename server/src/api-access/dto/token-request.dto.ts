import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * RFC 6749 Section 4.4 -- Client Credentials Grant.
 * Field names are snake_case because the OAuth 2.0 spec mandates them.
 */
export class TokenRequestDto {
  @IsIn(['client_credentials'])
  grant_type: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  client_id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  client_secret?: string;

  /** Space-delimited scope request. Omit to receive the client's full grant. */
  @IsOptional()
  @IsString()
  scope?: string;
}
