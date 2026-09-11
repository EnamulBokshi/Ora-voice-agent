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
import { EntitlementService } from '../entitlement/entitlement.service';
import { NO_SUBSCRIPTION_REQUIRED_KEY } from '../decorators/no-subscription-required.decorator';
import { DomainException } from '../exceptions/domain.exception';
import { ApiKeyUtil } from '../utils/api-key.util';

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
    private readonly entitlementService: EntitlementService,
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
      if (candidate.startsWith('ora_sk_')) {
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
          // A machine token acts for the merchant, so it is subject to the
          // merchant's subscription like every other credential here.
          await this.assertEntitled(context, request);
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
   * Requires an active subscription for the tenant the accepted credential
   * belongs to.
   *
   * Every credential this guard accepts reaches the same paid endpoints, so the
   * check belongs here rather than on the routes: a secret API key in the
   * merchant's own backend, an OAuth machine token, and a dashboard session all
   * have to answer for the same plan. Throws; the caller does not branch on it.
   */
  private async assertEntitled(
    context: ExecutionContext,
    request: any,
  ): Promise<void> {
    const exempt = this.reflector.getAllAndOverride<boolean>(
      NO_SUBSCRIPTION_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (exempt) return;

    const businessId = request.businessId || request.user?.businessId;
    if (!businessId) return;

    // ORA staff only. A machine client also carries `role: 'admin'`, and it
    // acts for the merchant, so it is not exempt.
    const role = request.user?.role;
    const isOraStaff =
      role === AdminRole.SUPER_ADMIN ||
      (role === AdminRole.ADMIN && !request.user?.isMachineClient);
    if (isOraStaff) return;

    await this.entitlementService.assertEntitled(businessId);
  }

  /**
   * Applies the route's @Scopes() and @Roles() metadata after a credential has
   * been accepted. `grantedScopes` is omitted for credentials that carry no
   * scopes of their own (a human dashboard session), where only @Roles() apply.
   */
  private async enforceRouteAuthorization(
    context: ExecutionContext,
    grantedScopes?: ApiScope[],
  ): Promise<boolean> {
    // The credential is accepted by this point, so the tenant is known. Both
    // paths that reach here — a secret API key and a dashboard session — are
    // paid surfaces.
    await this.assertEntitled(context, context.switchToHttp().getRequest());

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

  /**
   * Accepts a key issued before hashing was introduced, then rewrites the
   * record so the plaintext stops existing. `scripts/migrate-hash-secret-keys.ts`
   * does this in bulk; this covers a key that was in flight when it ran.
   */
  private async migrateLegacyPlaintextKey(
    apiKey: string,
    businessModel: Model<BusinessDocument>,
  ) {
    const legacy = await businessModel
      .findOne({ secretApiKey: apiKey, status: 'active' })
      .select('+secretApiKey')
      .exec();

    if (!legacy) {
      return null;
    }

    legacy.secretApiKeyHash = ApiKeyUtil.hash(apiKey);
    legacy.secretApiKeyHint = ApiKeyUtil.hint(apiKey);
    legacy.secretApiKey = null;

    try {
      await legacy.save();
      this.logger.log(
        `[DualAuthGuard] Migrated the plaintext secret key of business ${legacy._id.toString()} to a hash.`,
      );
    } catch (err: any) {
      // Authentication itself succeeded, so a failed rewrite must not deny the
      // request; the bulk migration will pick the record up.
      this.logger.error(
        `[DualAuthGuard] Failed to migrate the secret key of business ${legacy._id.toString()}: ${err.message}`,
      );
    }

    return legacy;
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
    // Every key is a real credential in the database -- there is no literal the
    // guard recognises on its own. Provision a local one with
    // `pnpm run seed:dev-store`.
    //
    // Only the hash is stored, so the presented key is hashed and looked up by
    // its index rather than compared against a stored plaintext.
    let business = await businessModel
      .findOne({
        secretApiKeyHash: ApiKeyUtil.hash(apiKey),
        status: 'active',
      })
      .exec();

    if (!business) {
      business = await this.migrateLegacyPlaintextKey(
        apiKey,
        businessModel,
      );
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
