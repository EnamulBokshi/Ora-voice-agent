import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request } from 'express';
import { ShopifyConnectorService } from './services/shopify-connector.service';
import { WooCommerceConnectorService } from './services/woocommerce-connector.service';
import { FeedParserService } from './services/feed-parser.service';
import { SitemapCrawlerService } from './services/sitemap-crawler.service';
import { ManualConnectorService } from './services/manual-connector.service';
import { FileIngestionService } from './services/file-ingestion.service';
import { DomSemanticStructurerService } from './services/dom-semantic-structurer.service';
import { DomTelemetryDto } from './dto/dom-telemetry.dto';
import { FeedIngestDto } from './dto/feed-ingest.dto';
import { PassiveIngestDto } from './dto/passive-ingest.dto';
import { ManualIngestDto } from './dto/manual-ingest.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Business, BusinessDocument } from '../users/schemas/business.schema';

/**
 * A signature covers the exact bytes that were received, so a parsed body is
 * not a usable substitute. main.ts creates the app with `rawBody: true`.
 */
const UNVERIFIABLE_BODY_MESSAGE =
  'Raw request body is unavailable, so the webhook signature cannot be verified.';

@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly shopifyService: ShopifyConnectorService,
    private readonly woocommerceService: WooCommerceConnectorService,
    private readonly feedParserService: FeedParserService,
    private readonly sitemapCrawlerService: SitemapCrawlerService,
    private readonly domSemanticStructurer: DomSemanticStructurerService,
    private readonly manualConnectorService: ManualConnectorService,
    private readonly fileIngestionService: FileIngestionService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) {}

  /**
   * Primary Product File Ingestion Endpoint (CSV, XLSX, TXT, PDF)
   * Uploads merchant product file, normalizes items, batch-syncs to MongoDB,
   * and auto-embeds into the VectorIndex RAG store in a single flow.
   */
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadProductFile(
    @CurrentUser() user: JwtPayloadUser,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('A product file (CSV, XLSX, TXT, or PDF) is required.');
    }
    return this.fileIngestionService.ingestFile(user.businessId, file);
  }

  // Tier 1 Public Platform Webhooks (Shopify / WooCommerce) with HMAC Verification & Domain Lookup
  @Post('webhooks/:platform')
  @HttpCode(HttpStatus.OK)
  async handlePlatformWebhook(
    @Param('platform') platform: string,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-webhook-id') webhookId: string,
    @Headers('x-shopify-hmac-sha256') shopifyHmac: string,
    @Headers('x-shopify-shop-domain') shopifyDomain: string,
    @Headers('x-wc-webhook-signature') wcSignature: string,
    @Headers('x-wc-webhook-source') wcSourceHeader: string,
    @Req() req: Request,
    @Body() payload: any,
  ) {
    // Re-serializing the parsed body cannot reproduce the bytes that were
    // signed, so a missing rawBody is a misconfiguration, not a fallback.
    const rawBody: Buffer | undefined = (req as any).rawBody;

    if (platform === 'shopify') {
      if (!rawBody) {
        throw new BadRequestException(UNVERIFIABLE_BODY_MESSAGE);
      }

      const isVerified = this.shopifyService.verifyWebhookHmac(rawBody, shopifyHmac);
      if (!isVerified) {
        throw new UnauthorizedException('Invalid Shopify webhook HMAC signature.');
      }

      // The tenant is resolved only from the signed request's shop domain. A
      // businessId in a header or the body is never trusted, so a caller
      // cannot direct a verified payload at another merchant.
      let businessId: string | undefined;

      if (shopifyDomain) {
        const domainClean = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const business = await this.businessModel.findOne({
          $or: [
            { shopifyStoreUrl: shopifyDomain },
            { shopifyStoreUrl: `https://${domainClean}` },
            { shopifyStoreUrl: domainClean },
          ],
        }).exec();

        if (business) {
          businessId = business._id.toString();
        }
      }

      if (!businessId) {
        throw new BadRequestException(
          'No merchant is connected to the Shopify store domain that sent this webhook.',
        );
      }

      return this.shopifyService.processWebhook(
        businessId,
        topic || 'products/update',
        webhookId || `wh_${Date.now()}`,
        payload,
      );
    }

    if (platform === 'woocommerce') {
      if (!rawBody) {
        throw new BadRequestException(UNVERIFIABLE_BODY_MESSAGE);
      }

      const isVerified = this.woocommerceService.verifyWebhookHmac(rawBody, wcSignature);
      if (!isVerified) {
        throw new UnauthorizedException('Invalid WooCommerce webhook signature.');
      }

      // As above: the tenant comes from the signed request's store URL only.
      let businessId: string | undefined;
      const storeUrl = payload?.store_url || wcSourceHeader;

      if (storeUrl) {
        const urlClean = storeUrl.replace(/\/$/, '');
        const business = await this.businessModel.findOne({
          $or: [
            { woocommerceStoreUrl: storeUrl },
            { woocommerceStoreUrl: urlClean },
          ],
        }).exec();

        if (business) {
          businessId = business._id.toString();
        }
      }

      if (!businessId) {
        throw new BadRequestException(
          'No merchant is connected to the WooCommerce store URL that sent this webhook.',
        );
      }

      const products = Array.isArray(payload) ? payload : payload?.products || [payload];
      return this.woocommerceService.syncProducts(businessId, products);
    }

    return { received: true, platform };
  }

  // Tier 2 Catalog Feed Ingestion
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Post('feed')
  @HttpCode(HttpStatus.OK)
  async ingestFeed(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: FeedIngestDto,
  ) {
    return this.feedParserService.parseAndIngestFeed(
      user.businessId,
      dto.feedUrl,
    );
  }

  // Tier 3 Passive Storefront Capture (Widget Originated via Publishable Key)
  @UseGuards(ApiKeyGuard)
  @Post('passive')
  @HttpCode(HttpStatus.OK)
  async passiveCapture(@Req() req: any, @Body() dto: PassiveIngestDto) {
    return this.sitemapCrawlerService.processPassiveCapture(
      req.businessId,
      dto,
    );
  }

  // Universal Storefront / Portfolio / SPA Viewport Telemetry Beacon
  @UseGuards(ApiKeyGuard)
  @Post('telemetry')
  @HttpCode(HttpStatus.OK)
  async telemetryCapture(@Req() req: any, @Body() dto: DomTelemetryDto) {
    return this.domSemanticStructurer.processTelemetry(
      req.businessId,
      dto,
    );
  }

  /**
   * Sync from Website URL / Deep Storefront Crawler Endpoint.
   * Auto-detects platform, fast-syncs catalog/policies, and crawls public sitemaps.
   */
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Post('crawl-store')
  @HttpCode(HttpStatus.OK)
  async crawlStore(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: { domain: string },
  ) {
    if (!dto.domain) {
      throw new BadRequestException('A valid website domain or URL is required.');
    }
    return this.sitemapCrawlerService.syncFromWebsite({
      businessId: user.businessId,
      domain: dto.domain,
    });
  }

  // Tier 4 Custom Endpoint Field Mapping
  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Post('manual')
  @HttpCode(HttpStatus.OK)
  async manualMapping(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: ManualIngestDto,
  ) {
    return this.manualConnectorService.processManualMapping(
      user.businessId,
      dto,
    );
  }
}

