import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { ApiClientService } from './api-client.service';
import { TokenRequestDto } from './dto/token-request.dto';
import { CreateApiClientDto } from './dto/create-api-client.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { DomainException } from '../common/exceptions/domain.exception';

@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly apiClientService: ApiClientService,
  ) {}

  /**
   * OAuth 2.0 token endpoint (RFC 6749 Section 4.4).
   *
   * Credentials may arrive either in the body or via HTTP Basic auth, as the
   * spec allows. Unauthenticated by design -- the credentials *are* the auth.
   */
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async token(@Body() dto: TokenRequestDto, @Req() req: any) {
    const { clientId, clientSecret } = this.extractCredentials(dto, req);

    return this.oauthService.issueClientToken(
      clientId,
      clientSecret,
      dto.scope,
      this.callerIp(req),
    );
  }

  /**
   * Issues credentials for a machine client. Merchant-authenticated, so the
   * tenant comes from the dashboard session and a client can only ever be
   * bound to the caller's own business.
   */
  @Post('clients')
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  @HttpCode(HttpStatus.CREATED)
  async createClient(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateApiClientDto,
  ) {
    return this.apiClientService.createClient(user.businessId, dto, user.sub);
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  async listClients(@CurrentUser() user: JwtPayloadUser) {
    return this.apiClientService.listClients(user.businessId);
  }

  @Delete('clients/:id')
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  async revokeClient(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.apiClientService.revokeClient(user.businessId, id, user.sub);
  }

  /** Supports both `client_secret_post` and `client_secret_basic`. */
  private extractCredentials(dto: TokenRequestDto, req: any) {
    let clientId = dto.client_id;
    let clientSecret = dto.client_secret;

    const authHeader: string = req.headers?.['authorization'] || '';
    if (!clientId && authHeader.toLowerCase().startsWith('basic ')) {
      const decoded = Buffer.from(
        authHeader.slice(6).trim(),
        'base64',
      ).toString('utf-8');
      const separator = decoded.indexOf(':');
      if (separator > 0) {
        try {
          clientId = decodeURIComponent(decoded.slice(0, separator));
          clientSecret = decodeURIComponent(decoded.slice(separator + 1));
        } catch {
          clientId = decoded.slice(0, separator);
          clientSecret = decoded.slice(separator + 1);
        }
      }
    }

    if (!clientId || !clientSecret) {
      throw new DomainException(
        'invalid_client',
        'client_id and client_secret are required, either in the request body or as HTTP Basic credentials.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return { clientId, clientSecret };
  }

  private callerIp(req: any): string | undefined {
    // X-Forwarded-For is only meaningful behind a trusted proxy; the left-most
    // entry is the original client when the chain is trusted end to end.
    const forwarded: string = req.headers?.['x-forwarded-for'] || '';
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress;
  }
}
