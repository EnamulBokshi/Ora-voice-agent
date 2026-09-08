import { SetMetadata } from '@nestjs/common';
import { ApiScope } from '../schemas/api-client.schema';

export const SCOPES_KEY = 'oauth_scopes';

/** Declares the OAuth 2.0 scopes a route requires. */
export const Scopes = (...scopes: ApiScope[]) =>
  SetMetadata(SCOPES_KEY, scopes);
