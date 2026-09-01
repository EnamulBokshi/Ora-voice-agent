import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { IngestionController } from './ingestion.controller';
import { ShopifyConnectorService } from './services/shopify-connector.service';
import { WooCommerceConnectorService } from './services/woocommerce-connector.service';
import { FeedParserService } from './services/feed-parser.service';
import { SitemapCrawlerService } from './services/sitemap-crawler.service';
import { SitemapCrawlerProcessor, HTML_CRAWL_QUEUE } from './services/sitemap-crawler.processor';
import { PlatformSnifferService } from './services/platform-sniffer.service';
import { PlatformFastPathService } from './services/platform-fast-path.service';
import { SitemapDiscoveryService } from './services/sitemap-discovery.service';
import { JsonLdExtractor } from './extractors/json-ld.extractor';
import { ReadabilityExtractor } from './extractors/readability.extractor';
import { ManualConnectorService } from './services/manual-connector.service';
import { FileIngestionService } from './services/file-ingestion.service';
import { DomSemanticStructurerService } from './services/dom-semantic-structurer.service';
import { ProductsModule } from '../products/products.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { VectorModule } from '../vector/vector.module';
import { RedisModule } from '../common/redis/redis.module';
import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { AgentConfig, AgentConfigSchema } from '../agent-config/schemas/agent-config.schema';

@Module({
  imports: [
    ConfigModule,
    ProductsModule,
    KnowledgeModule,
    VectorModule,
    RedisModule,
    BullModule.registerQueue({
      name: HTML_CRAWL_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: AgentConfig.name, schema: AgentConfigSchema },
    ]),
  ],
  controllers: [IngestionController],
  providers: [
    ShopifyConnectorService,
    WooCommerceConnectorService,
    FeedParserService,
    SitemapCrawlerService,
    SitemapCrawlerProcessor,
    DomSemanticStructurerService,
    PlatformSnifferService,
    PlatformFastPathService,
    SitemapDiscoveryService,
    JsonLdExtractor,
    ReadabilityExtractor,
    ManualConnectorService,
    FileIngestionService,
  ],
  exports: [
    ShopifyConnectorService,
    WooCommerceConnectorService,
    FeedParserService,
    SitemapCrawlerService,
    DomSemanticStructurerService,
    ManualConnectorService,
    FileIngestionService,
  ],
})
export class IngestionModule {}
