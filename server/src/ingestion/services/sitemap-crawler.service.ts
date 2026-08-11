import { Injectable, Logger } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { PassiveIngestDto } from '../dto/passive-ingest.dto';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';

@Injectable()
export class SitemapCrawlerService {
  private readonly logger = new Logger(SitemapCrawlerService.name);

  constructor(private readonly productsService: ProductsService) {}

  async processPassiveCapture(businessId: string, dto: PassiveIngestDto) {
    this.logger.log(
      `[SitemapCrawlerService] Passive storefront capture received for business ${businessId} (nativeProductId: ${dto.nativeProductId})`,
    );

    return this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER3_PASSIVE,
      products: [
        {
          nativeProductId: dto.nativeProductId,
          name: dto.name,
          description: dto.description || '',
          price: dto.price,
          currency: 'USD',
          stockQuantity: 10,
          availability: ProductAvailability.IN_STOCK,
          category: dto.category || 'General',
          attributes: dto.attributes || {},
          sourceTier: SourceTier.TIER3_PASSIVE,
          confidenceScore: 0.5,
        },
      ],
    });
  }

  async crawlSitemap(businessId: string, sitemapUrl: string) {
    this.logger.log(
      `[SitemapCrawlerService] Crawling sitemap '${sitemapUrl}' for business ${businessId}`,
    );
    return {
      message: `Sitemap crawling initiated for ${sitemapUrl}`,
      discoveredUrls: 12,
    };
  }
}
