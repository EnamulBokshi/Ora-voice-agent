import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { IngestionController } from './ingestion.controller';
import { ShopifyConnectorService } from './services/shopify-connector.service';
import { WooCommerceConnectorService } from './services/woocommerce-connector.service';
import { FeedParserService } from './services/feed-parser.service';
import { SitemapCrawlerService } from './services/sitemap-crawler.service';
import { ManualConnectorService } from './services/manual-connector.service';
import { ProductsModule } from '../products/products.module';
import { RedisModule } from '../common/redis/redis.module';
import { Business, BusinessSchema } from '../users/schemas/business.schema';

@Module({
  imports: [
    ConfigModule,
    ProductsModule,
    RedisModule,
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
    ]),
  ],

  controllers: [IngestionController],
  providers: [
    ShopifyConnectorService,
    WooCommerceConnectorService,
    FeedParserService,
    SitemapCrawlerService,
    ManualConnectorService,
  ],
  exports: [
    ShopifyConnectorService,
    WooCommerceConnectorService,
    FeedParserService,
    SitemapCrawlerService,
    ManualConnectorService,
  ],
})
export class IngestionModule {}
