import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ShopifyService } from './shopify.service';
import { ShopifyComplianceService } from './shopify-compliance.service';
import { ShopifyProvider } from '../billing/providers/shopify.provider';
import { ShopifyBillingSubscribeDto } from './dto/shopify-billing.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { SHOPIFY_COMPLIANCE_TOPICS } from './shopify.constants';
import { ShopifyConnectorService } from '../ingestion/services/shopify-connector.service';

/**
 * A signature covers the exact bytes received, so a re-serialized body cannot
 * reproduce them. main.ts creates the app with `rawBody: true`.
 */
const UNVERIFIABLE_BODY_MESSAGE =
  'Raw request body is unavailable, so the webhook signature cannot be verified.';

@Controller('shopify')
export class ShopifyController {
  private readonly logger = new Logger(ShopifyController.name);

  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly complianceService: ShopifyComplianceService,
    private readonly shopifyProvider: ShopifyProvider,
    private readonly connectorService: ShopifyConnectorService,
  ) {}

  /**
   * The embedded app's only authentication call.
   *
   * The client sends its App Bridge session token and receives a standard ORA
   * session, which every existing guard already accepts. It is called on each
   * page load because App Bridge tokens live about a minute, so the install
   * work behind it runs once and the rest of the calls are cheap.
   */
  @Post('session')
  @HttpCode(HttpStatus.OK)
  async exchangeSession(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
  ) {
    const token = this.bearerTokenFrom(authorization);
    if (!token) {
      throw new UnauthorizedException(
        'An Authorization: Bearer <session token> header is required.',
      );
    }

    return this.shopifyService.establishSession(token, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  /**
   * Non-embedded install entry point. Kept as a fallback: Shopify-managed
   * installation plus token exchange is the primary path and needs neither this
   * route nor the callback below.
   */
  @Get('auth')
  async beginAuth(@Query('shop') shop: string, @Res() res: Response) {
    if (!shop) {
      throw new BadRequestException('A shop query parameter is required.');
    }

    const url = await this.shopifyService.buildAuthorizeUrl(shop);
    // @Res() is deliberate: the global TransformInterceptor would otherwise
    // wrap this redirect in a response envelope.
    return res.redirect(url);
  }

  /**
   * OAuth callback for the fallback flow.
   *
   * Two constraints apply here and nowhere else. The HMAC is computed over the
   * raw query string, because the parsed query object reorders keys and
   * percent-decodes values and so cannot reproduce the signed bytes. And no DTO
   * validates this route: the global ValidationPipe runs with
   * `forbidNonWhitelisted: true`, which would reject the parameters Shopify
   * adds over time and strip the ones the signature covers.
   */
  @Get('callback')
  async completeAuth(@Req() req: Request, @Res() res: Response) {
    const rawQuery = req.originalUrl.split('?')[1] || '';

    if (!this.shopifyService.verifyQueryHmac(rawQuery)) {
      throw new UnauthorizedException('Invalid Shopify callback HMAC signature.');
    }

    const params = new URLSearchParams(rawQuery);
    const shop = params.get('shop');
    const code = params.get('code');
    const state = params.get('state');

    if (!shop || !code) {
      throw new BadRequestException('The callback is missing shop or code.');
    }

    await this.shopifyService.consumeNonce(shop, state || '');

    const { accessToken, scopes } = await this.shopifyService.exchangeCode(
      shop,
      code,
    );
    const business = await this.shopifyService.provisionTenant(
      shop,
      accessToken,
      scopes,
    );

    this.logger.log(
      `[ShopifyController] Fallback install complete for ${shop} (business ${business._id.toString()}).`,
    );

    const shopDomain = this.shopifyService.normalizeShopDomain(shop);
    const storeHandle = shopDomain.replace('.myshopify.com', '');
    const apiKey = process.env.SHOPIFY_API_KEY || '';

    return res.redirect(
      `https://admin.shopify.com/store/${storeHandle}/apps/${apiKey}`,
    );
  }

  /**
   * Starts a Shopify-billed subscription. Nothing is charged until the merchant
   * approves it on the Shopify-hosted screen the confirmation URL points to.
   */
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Post('billing/subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: ShopifyBillingSubscribeDto,
  ) {
    const result = await this.shopifyProvider.createAppSubscription(
      user.businessId,
      dto.planId,
      dto.returnUrl,
    );

    return {
      subscriptionId: result.subscriptionId,
      confirmationUrl: result.confirmationUrl,
      message: 'Approve the charge on Shopify to activate the plan.',
    };
  }

  /**
   * Where Shopify returns the merchant after the approval screen. The charge id
   * is re-read from Shopify rather than trusted from the query string.
   */
  @Get('billing/callback')
  async billingCallback(
    @Query('charge_id') chargeId: string,
    @Query('shop') shop: string,
    @Res() res: Response,
  ) {
    if (!chargeId || !shop) {
      throw new BadRequestException(
        'The billing callback is missing charge_id or shop.',
      );
    }

    const business = await this.shopifyService.findBusinessByShopDomain(shop);
    if (!business) {
      throw new BadRequestException('No installed store matches that shop.');
    }

    const status = await this.shopifyProvider.fetchSubscriptionStatus(
      business._id.toString(),
      `gid://shopify/AppSubscription/${chargeId}`,
    );

    this.logger.log(
      `[ShopifyController] Billing callback for ${shop}: charge ${chargeId} is ${status}.`,
    );

    const storeHandle = this.shopifyService
      .normalizeShopDomain(shop)
      .replace('.myshopify.com', '');
    const apiKey = process.env.SHOPIFY_API_KEY || '';

    return res.redirect(
      `https://admin.shopify.com/store/${storeHandle}/apps/${apiKey}?billing=${status || 'unknown'}`,
    );
  }

  /**
   * Shopify's three mandatory compliance webhooks.
   *
   * These need their own route because they are not tenant-scoped catalog
   * events: `shop/redact` arrives after the tenant has been suspended, and its
   * payload carries no product data for the ingestion path to upsert.
   */
  @Post('webhooks/compliance/:topic')
  @HttpCode(HttpStatus.OK)
  async handleCompliance(
    @Param('topic') topic: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Req() req: Request,
    @Body() payload: any,
  ) {
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (!rawBody) {
      throw new BadRequestException(UNVERIFIABLE_BODY_MESSAGE);
    }

    // The same verifier the catalog webhooks use, so one secret and one
    // comparison implementation cover every inbound Shopify request.
    if (!this.connectorService.verifyWebhookHmac(rawBody, hmac)) {
      throw new UnauthorizedException('Invalid Shopify webhook HMAC signature.');
    }

    const normalizedTopic = topic.replace(/-/g, '/');
    if (!SHOPIFY_COMPLIANCE_TOPICS.includes(normalizedTopic)) {
      throw new BadRequestException(`Unsupported compliance topic: ${topic}.`);
    }

    switch (normalizedTopic) {
      case 'customers/data_request':
        return this.complianceService.handleCustomerDataRequest(payload);
      case 'customers/redact':
        await this.complianceService.handleCustomerRedact(payload);
        return { status: 'redacted' };
      case 'shop/redact':
        await this.complianceService.handleShopRedact(payload);
        return { status: 'redacted' };
      default:
        // Unreachable: the topic list is checked above.
        throw new BadRequestException(`Unsupported compliance topic: ${topic}.`);
    }
  }

  private bearerTokenFrom(authorization?: string): string | null {
    if (!authorization) return null;
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
  }
}
