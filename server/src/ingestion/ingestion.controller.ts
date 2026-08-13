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
import type { Request } from 'express';
import { ShopifyConnectorService } from './services/shopify-connector.service';
import { WooCommerceConnectorService } from './services/woocommerce-connector.service';
import { FeedParserService } from './services/feed-parser.service';
import { SitemapCrawlerService } from './services/sitemap-crawler.service';
import { ManualConnectorService } from './services/manual-connector.service';
import { FileIngestionService } from './services/file-ingestion.service';
import { FeedIngestDto } from './dto/feed-ingest.dto';
import { PassiveIngestDto } from './dto/passive-ingest.dto';
import { ManualIngestDto } from './dto/manual-ingest.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly shopifyService: ShopifyConnectorService,
    private readonly woocommerceService: WooCommerceConnectorService,
    private readonly feedParserService: FeedParserService,
    private readonly sitemapCrawlerService: SitemapCrawlerService,
    private readonly manualConnectorService: ManualConnectorService,
    private readonly fileIngestionService: FileIngestionService,
  ) {}

  /**
   * Primary Product File Ingestion Endpoint (CSV, XLSX, TXT, PDF)
   * Uploads merchant product file, normalizes items, batch-syncs to MongoDB,
   * and auto-embeds into the VectorIndex RAG store in a single flow.
   */
  @UseGuards(JwtAuthGuard, TenantScopeGuard)
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

  // Tier 1 Public Platform Webhooks (Shopify / WooCommerce) with HMAC Verification
  @Post('webhooks/:platform')
  @HttpCode(HttpStatus.OK)
  async handlePlatformWebhook(
    @Param('platform') platform: string,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-webhook-id') webhookId: string,
    @Headers('x-shopify-hmac-sha256') shopifyHmac: string,
    @Headers('x-wc-webhook-signature') wcSignature: string,
    @Headers('x-business-id') businessIdHeader: string,
    @Req() req: Request,
    @Body() payload: any,
  ) {
    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(payload || {}));

    if (platform === 'shopify') {
      const isVerified = this.shopifyService.verifyWebhookHmac(rawBody, shopifyHmac);
      if (!isVerified && process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Invalid Shopify webhook HMAC signature.');
      }

      const businessId = businessIdHeader || payload.businessId;
      if (!businessId) {
        throw new BadRequestException('Missing x-business-id header or businessId payload property.');
      }

      return this.shopifyService.processWebhook(
        businessId,
        topic || 'products/update',
        webhookId || `wh_${Date.now()}`,
        payload,
      );
    }

    if (platform === 'woocommerce') {
      const isVerified = this.woocommerceService.verifyWebhookHmac(rawBody, wcSignature);
      if (!isVerified && process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Invalid WooCommerce webhook signature.');
      }

      const businessId = businessIdHeader || payload.businessId;
      if (!businessId) {
        throw new BadRequestException('Missing x-business-id header or businessId payload property.');
      }

      const products = Array.isArray(payload) ? payload : payload.products || [payload];
      return this.woocommerceService.syncProducts(businessId, products);
    }

    return { received: true, platform };
  }

  // Tier 2 Catalog Feed Ingestion
  @UseGuards(JwtAuthGuard, TenantScopeGuard)
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

  // Tier 4 Custom Endpoint Field Mapping
  @UseGuards(JwtAuthGuard, TenantScopeGuard)
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
