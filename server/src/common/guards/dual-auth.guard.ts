import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isObservable, lastValueFrom } from 'rxjs';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TenantScopeGuard } from './tenant-scope.guard';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AdminRole } from '../../users/enums/admin-role.enum';
import { OAuthScopesGuard } from '../../api-access/guards/oauth-scopes.guard';
import { MACHINE_TOKEN_AUDIENCE } from '../../api-access/oauth.service';
import { SCOPES_KEY } from '../../api-access/decorators/scopes.decorator';
import { ApiScope } from '../../api-access/schemas/api-client.schema';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { DomainException } from '../exceptions/domain.exception';

/**
 * Development-only playground key. Never matched when NODE_ENV=production.
 */
const DEV_MOCK_PUBLISHABLE_KEY = 'biz_live_mock_key_12345';

/** A secret API key acts for the entire tenant, so it carries every scope. */
const SECRET_KEY_SCOPES: ApiScope[] = Object.values(ApiScope);

/**
 * DualAuthGuard allows an endpoint to be authenticated via:
 * 1. Zero-Login Secret API Key: Header `X-API-Key: ora_sk_...` or `Authorization: Bearer ora_sk_...`.
 *    Direct server-to-server access without any login or token exchange.
 *    Publishable widget keys (`biz_live_...`) are public -- they are embedded in
 *    storefront HTML -- and are NEVER accepted here. They authorize WebSocket
 *    session initiation only (see ConversationGateway / VoiceGateway).
 * 2. OAuth 2.0 Machine Bearer Token: For clients using rotating client_credentials tokens.
 * 3. Merchant Dashboard User Session: Human admin login via cookies or dashboard JWT.
 */
@Injectable()
export class DualAuthGuard implements CanActivate {
  private readonly logger = new Logger(DualAuthGuard.name);
  private readonly jwtAuthGuard = new JwtAuthGuard();
  private readonly tenantScopeGuard = new TenantScopeGuard();

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Check for Static API Key (Zero-Login Developer Flow)
    // ──────────────────────────────────────────────────────────────────────────
    const headerApiKey = request.headers['x-api-key'];
    let apiKey: string | undefined =
      typeof headerApiKey === 'string' && headerApiKey.trim()
        ? headerApiKey.trim()
        : undefined;

    const authHeader: string = request.headers['authorization'] || '';
    if (!apiKey && authHeader.toLowerCase().startsWith('bearer ')) {
      const candidate = authHeader.slice(7).trim();
      if (
        candidate.startsWith('ora_sk_') ||
        candidate === 'ora_dev_key' ||
        candidate === DEV_MOCK_PUBLISHABLE_KEY
      ) {
        apiKey = candidate;
      }
    }

    if (apiKey) {
      const authenticated = await this.authenticateApiKey(apiKey, request);
      if (!authenticated) {
        return false;
      }
      // A secret API key acts for the whole tenant, so it holds every scope.
      // @Scopes() and @Roles() on the route are still evaluated, so a route
      // that later narrows them is enforced on this path too.
      return this.enforceRouteAuthorization(context, SECRET_KEY_SCOPES);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Check for OAuth 2.0 Machine Bearer Token (token_use: client_credentials)
    // ──────────────────────────────────────────────────────────────────────────
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      let decoded: any = null;
      try {
        const jwtService = this.moduleRef.get(JwtService, { strict: false });
        if (jwtService) {
          decoded = jwtService.decode(token);
        }
      } catch {
        // Leave decoded as null
      }

      if (
        decoded &&
        (decoded.token_use === 'client_credentials' ||
          decoded.aud === MACHINE_TOKEN_AUDIENCE)
      ) {
        const oauthScopesGuard = this.moduleRef.get(OAuthScopesGuard, {
          strict: false,
        });

        if (!oauthScopesGuard) {
          throw new DomainException(
            'INTERNAL_ERROR',
            'OAuth guard provider is unavailable.',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        const allowed = await oauthScopesGuard.canActivate(context);
        if (allowed) {
          request.user = {
            sub: request.apiClientId,
            businessId: request.businessId,
            role: 'admin',
            isMachineClient: true,
          };
          return true;
        }
        return false;
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Fallback to Merchant Dashboard Session (JwtAuthGuard + TenantScopeGuard)
    // ──────────────────────────────────────────────────────────────────────────
    try {
      const jwtResult = this.jwtAuthGuard.canActivate(context);
      const jwtPassed = isObservable(jwtResult)
        ? await lastValueFrom(jwtResult)
        : await jwtResult;

      if (!jwtPassed) {
        return false;
      }
    } catch {
      throw new DomainException(
        'AUTHENTICATION_REQUIRED',
        'Authentication required. Provide an API key (X-API-Key) or Bearer token.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tenantPassed = this.tenantScopeGuard.canActivate(context);
    if (!tenantPassed) {
      return false;
    }

    return this.enforceRouteAuthorization(context);
  }

  /**
   * Applies the route's @Scopes() and @Roles() metadata after a credential has
   * been accepted. `grantedScopes` is omitted for credentials that carry no
   * scopes of their own (a human dashboard session), where only @Roles() apply.
   */
  private enforceRouteAuthorization(
    context: ExecutionContext,
    grantedScopes?: ApiScope[],
  ): boolean {
    if (grantedScopes) {
      const requiredScopes =
        this.reflector.getAllAndOverride<ApiScope[]>(SCOPES_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) || [];

      const missing = requiredScopes.filter((s) => !grantedScopes.includes(s));
      if (missing.length > 0) {
        throw new DomainException(
          'insufficient_scope',
          `This credential is missing required scope(s): ${missing.join(', ')}.`,
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const rolesGuard = new RolesGuard(this.reflector);
      return rolesGuard.canActivate(context);
    }

    return true;
  }

  private async authenticateApiKey(
    apiKey: string,
    request: any,
  ): Promise<boolean> {
    let businessModel: Model<BusinessDocument> | undefined;
    try {
      businessModel = this.moduleRef.get(getModelToken(Business.name), {
        strict: false,
      });
    } catch (err: any) {
      this.logger.error(
        `[DualAuthGuard] Failed to resolve BusinessModel: ${err.message}`,
      );
    }

    if (!businessModel) {
      throw new DomainException(
        'INTERNAL_ERROR',
        'Database connection unavailable.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Secret keys only. Publishable keys are public and must never authenticate
    // a REST endpoint. `status: 'active'` makes suspension take effect at once.
    let business = await businessModel
      .findOne({ secretApiKey: apiKey, status: 'active' })
      .exec();

    // In development mode, accept dev keys and link to active or playground store
    if (
      !business &&
      process.env.NODE_ENV !== 'production' &&
      (apiKey === 'ora_dev_key' ||
        apiKey.startsWith('ora_sk_dev') ||
        apiKey === DEV_MOCK_PUBLISHABLE_KEY)
    ) {
      business = await businessModel.findOne({ status: 'active' }).exec();
      if (!business) {
        business = await businessModel
          .findOneAndUpdate(
            { publishableKey: DEV_MOCK_PUBLISHABLE_KEY },
            {
              name: 'Dev Playground Store',
              publishableKey: DEV_MOCK_PUBLISHABLE_KEY,
              secretApiKey: 'ora_sk_dev_key',
              status: 'active',
            },
            { upsert: true, returnDocument: 'after' },
          )
          .exec();
      }
    }

    if (!business) {
      throw new DomainException(
        'INVALID_API_KEY',
        'Invalid or revoked API key.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.business = business;
    request.businessId = business._id.toString();
    request.user = {
      sub: business._id.toString(),
      businessId: business._id.toString(),
      role: 'admin',
      isApiKey: true,
    };

    return true;
  }
}
