import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ShopifyConnectorService } from './services/shopify-connector.service';
import { WooCommerceConnectorService } from './services/woocommerce-connector.service';
import { FeedParserService } from './services/feed-parser.service';
import { SitemapCrawlerService } from './services/sitemap-crawler.service';
import { ManualConnectorService } from './services/manual-connector.service';
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
  ) {}

  // Tier 1 Public Platform Webhooks (Shopify / WooCommerce)
  @Post('webhooks/:platform')
  @HttpCode(HttpStatus.OK)
  async handlePlatformWebhook(
    @Param('platform') platform: string,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-webhook-id') webhookId: string,
    @Headers('x-shopify-hmac-sha256') hmacHeader: string,
    @Headers('x-business-id') businessIdHeader: string,
    @Req() req: Request,
    @Body() payload: any,
  ) {
    if (platform === 'shopify') {
      const businessId = businessIdHeader || payload.businessId || 'default_tenant';
      return this.shopifyService.processWebhook(
        businessId,
        topic || 'products/update',
        webhookId || `wh_${Date.now()}`,
        payload,
      );
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
