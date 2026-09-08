import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiClientService } from '../api-client.service';
import {
  ClientTokenPayload,
  MACHINE_TOKEN_AUDIENCE,
  OAuthService,
} from '../oauth.service';
import { ApiScope } from '../schemas/api-client.schema';
import { DomainException } from '../../common/exceptions/domain.exception';
import { RedisService } from '../../common/redis/redis.service';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

/**
 * Validates a Bearer access token issued by the client-credentials grant and
 * enforces the scopes declared with @Scopes().
 *
 * On success it sets request.businessId from the *token*, which is the only
 * place downstream handlers may read the tenant from. A businessId in the body
 * or a header is never consulted.
 */
@Injectable()
export class OAuthScopesGuard implements CanActivate {
  private readonly logger = new Logger(OAuthScopesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly oauthService: OAuthService,
    private readonly apiClientService: ApiClientService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader: string = request.headers['authorization'] || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      throw new DomainException(
        'invalid_request',
        'An OAuth 2.0 Bearer access token is required. Obtain one from POST /api/v1/oauth/token.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.slice(7).trim();

    let payload: ClientTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<ClientTokenPayload>(token, {
        secret: this.oauthService.getSigningSecret(),
        audience: MACHINE_TOKEN_AUDIENCE,
      });
    } catch {
      throw new DomainException(
        'invalid_token',
        'Access token is invalid or has expired.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Reject anything that is not a machine token, so a stolen dashboard
    // session token cannot be presented here.
    if (payload.token_use !== 'client_credentials' || !payload.businessId) {
      throw new DomainException(
        'invalid_token',
        'Access token is not valid for the machine API.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Re-check the client on every request so revocation is immediate rather
    // than delayed until the token's own expiry.
    const client = await this.apiClientService.findActiveByClientId(
      payload.sub,
    );
    if (!client) {
      throw new DomainException(
        'invalid_token',
        'The API client for this token has been suspended or revoked.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Guard against a token outliving a tenant reassignment.
    if (client.businessId.toString() !== payload.businessId) {
      this.logger.error(
        `[OAuthScopesGuard] Tenant mismatch for client ${payload.sub}: token says ${payload.businessId}, record says ${client.businessId}.`,
      );
      throw new DomainException(
        'invalid_token',
        'Access token no longer matches its client record.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const required =
      this.reflector.getAllAndOverride<ApiScope[]>(SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const missing = required.filter((s) => !payload.scopes?.includes(s));
    if (missing.length > 0) {
      throw new DomainException(
        'insufficient_scope',
        `This token is missing required scope(s): ${missing.join(', ')}.`,
        HttpStatus.FORBIDDEN,
      );
    }

    await this.enforceRequestRateLimit(payload.sub);

    request.apiClient = client;
    request.apiClientId = payload.sub;
    request.apiScopes = payload.scopes;
    // The single trusted source of tenant identity for this request.
    request.businessId = payload.businessId;

    return true;
  }

  private async enforceRequestRateLimit(clientId: string) {
    const redis = this.redisService.getClient();
    const key = `ratelimit:machineapi:${clientId}:${Math.floor(Date.now() / 60_000)}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 120);
    }

    if (count > 300) {
      throw new DomainException(
        'rate_limit_exceeded',
        'Per-client request rate limit exceeded (300/min).',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
