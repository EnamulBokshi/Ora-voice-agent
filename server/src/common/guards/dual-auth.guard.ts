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
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { DomainException } from '../exceptions/domain.exception';

/**
 * DualAuthGuard allows an endpoint to be authenticated via:
 * 1. Zero-Login Secret API Key: Header `X-API-Key: ora_sk_...` or `Authorization: Bearer ora_sk_...`.
 *    Direct server-to-server access without any login or token exchange.
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
    const headerApiKey =
      request.headers['x-api-key'] || request.headers['x-publishable-key'];
    let apiKey: string | undefined =
      typeof headerApiKey === 'string' ? headerApiKey.trim() : undefined;

    const authHeader: string = request.headers['authorization'] || '';
    if (!apiKey && authHeader.toLowerCase().startsWith('bearer ')) {
      const candidate = authHeader.slice(7).trim();
      if (
        candidate.startsWith('ora_sk_') ||
        candidate.startsWith('biz_live_') ||
        candidate === 'ora_dev_key'
      ) {
        apiKey = candidate;
      }
    }

    if (apiKey) {
      return this.authenticateApiKey(apiKey, request);
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

    let business = await businessModel
      .findOne({
        $or: [{ secretApiKey: apiKey }, { publishableKey: apiKey }],
      })
      .exec();

    // In development mode, accept dev keys and link to active or playground store
    if (
      !business &&
      process.env.NODE_ENV !== 'production' &&
      (apiKey === 'ora_dev_key' ||
        apiKey.startsWith('ora_sk_dev') ||
        apiKey === 'biz_live_mock_key_12345')
    ) {
      business = await businessModel.findOne({ status: 'active' }).exec();
      if (!business) {
        business = await businessModel
          .findOneAndUpdate(
            { publishableKey: 'biz_live_mock_key_12345' },
            {
              name: 'Dev Playground Store',
              publishableKey: 'biz_live_mock_key_12345',
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
