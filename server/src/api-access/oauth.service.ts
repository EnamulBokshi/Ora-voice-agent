import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiClientService } from './api-client.service';
import { RedisService } from '../common/redis/redis.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { ApiScope } from './schemas/api-client.schema';

/**
 * Claims carried by a client-credentials access token.
 *
 * `token_use` and `aud` exist so a machine token can never be replayed as a
 * user session token (and vice versa) even if both were signed with the same
 * secret. The user-facing JwtStrategy additionally requires a `sessionId`
 * claim, which these tokens deliberately never carry.
 */
export interface ClientTokenPayload {
  sub: string;
  businessId: string;
  scopes: ApiScope[];
  token_use: 'client_credentials';
  aud: 'ora-machine-api';
}

export const MACHINE_TOKEN_AUDIENCE = 'ora-machine-api';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  /** Access tokens are intentionally short-lived; there is no refresh token. */
  private readonly tokenTtlSeconds = 900;

  constructor(
    private readonly apiClientService: ApiClientService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Machine tokens are signed with their own secret when one is configured, so
   * rotating it invalidates every machine token without logging out any human.
   */
  getSigningSecret(): string {
    return (
      this.configService.get<string>('OAUTH_JWT_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'ora-secret-key-change-in-prod'
    );
  }

  /** RFC 6749 Section 4.4 -- client credentials grant. */
  async issueClientToken(
    clientId: string,
    clientSecret: string,
    requestedScope: string | undefined,
    callerIp?: string,
  ) {
    await this.enforceTokenRateLimit(clientId, callerIp);

    const client = await this.apiClientService.verifyCredentials(
      clientId,
      clientSecret,
      callerIp,
    );

    if (!client) {
      // Single opaque failure for unknown client, bad secret, revoked client
      // and blocked IP alike -- see verifyCredentials.
      this.logger.warn(
        `[OAuthService] Rejected token request for client_id '${clientId}' from ${callerIp}.`,
      );
      throw new DomainException(
        'invalid_client',
        'Client authentication failed.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Requested scopes may narrow the grant but never widen it.
    const granted = this.resolveScopes(client.scopes, requestedScope);

    const payload: ClientTokenPayload = {
      sub: client.clientId,
      businessId: client.businessId.toString(),
      scopes: granted,
      token_use: 'client_credentials',
      aud: MACHINE_TOKEN_AUDIENCE,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.getSigningSecret(),
      expiresIn: this.tokenTtlSeconds,
    });

    await this.apiClientService.touchLastUsed(client.clientId);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.tokenTtlSeconds,
      scope: granted.join(' '),
    };
  }

  private resolveScopes(
    clientScopes: ApiScope[],
    requestedScope?: string,
  ): ApiScope[] {
    if (!requestedScope?.trim()) {
      return clientScopes;
    }

    const requested = requestedScope.trim().split(/\s+/);
    const granted = clientScopes.filter((s) => requested.includes(s));

    if (granted.length === 0) {
      throw new DomainException(
        'invalid_scope',
        'None of the requested scopes are granted to this client.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return granted;
  }

  /**
   * Brute-force guard on the token endpoint, keyed on both client id and
   * caller IP so neither a single client nor a single host can grind secrets.
   */
  private async enforceTokenRateLimit(clientId: string, callerIp?: string) {
    const redis = this.redisService.getClient();
    const window = Math.floor(Date.now() / 60_000);

    const buckets = [
      `ratelimit:oauth:client:${clientId}:${window}`,
      `ratelimit:oauth:ip:${callerIp || 'unknown'}:${window}`,
    ];

    for (const key of buckets) {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 120);
      }
      if (count > 30) {
        throw new DomainException(
          'slow_down',
          'Too many token requests. Retry in a minute.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }
}
