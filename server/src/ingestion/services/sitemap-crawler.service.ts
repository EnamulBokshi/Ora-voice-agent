import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
          confidenceScore: 0.3,
        },
      ],
    });
  }

  async crawlSitemap(businessId: string, sitemapUrl: string) {
    this.logger.log(
      `[SitemapCrawlerService] Crawling sitemap '${sitemapUrl}' for business ${businessId}`,
    );

    let xmlText = '';
    try {
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'ORA-Sitemap-Crawler/1.0',
          Accept: 'application/xml, text/xml, */*',
        },
      });

      if (!response.ok) {
        throw new BadRequestException(
          `Failed to fetch sitemap URL '${sitemapUrl}': HTTP ${response.status}`,
        );
      }

      xmlText = await response.text();
    } catch (err: any) {
      this.logger.error(
        `[SitemapCrawlerService] Error fetching sitemap ${sitemapUrl}: ${err.message}`,
      );
      throw new BadRequestException(
        `Sitemap URL fetching failed: ${err.message}`,
      );
    }

    // Extract <loc> URLs from XML
    const locRegex = /<loc>(.*?)<\/loc>/gi;
    const urls: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = locRegex.exec(xmlText)) !== null) {
      if (match[1]) {
        urls.push(match[1].trim());
      }
    }

    if (urls.length === 0) {
      return {
        sitemapUrl,
        discoveredUrls: 0,
        ingestedCount: 0,
        message: 'No URLs found in sitemap XML.',
      };
    }

    // Filter product-like URLs (/product/, /item/, /p/, /shop/)
    const productUrls = urls.filter((url) =>
      /\/(product|products|item|items|p|shop)\//i.test(url),
    );
    const targetUrls = productUrls.length > 0 ? productUrls : urls.slice(0, 50);

    const products = targetUrls.map((url, index) => {
      const parts = url.replace(/\/$/, '').split('/');
      const slug = parts[parts.length - 1] || `url_${index}`;
      const name = slug
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      return {
        nativeProductId: `sitemap_${slug}`,
        name: name || `Product ${index + 1}`,
        description: `Discovered from sitemap: ${url}`,
        price: 0,
        currency: 'USD',
        stockQuantity: 1,
        availability: ProductAvailability.IN_STOCK,
        category: 'General',
        attributes: { sourceUrl: url },
        sourceTier: SourceTier.TIER3_PASSIVE,
        confidenceScore: 0.3,
      };
    });

    const syncResult = await this.productsService.batchSync(businessId, {
      sourceTier: SourceTier.TIER3_PASSIVE,
      products,
    });

    return {
      sitemapUrl,
      discoveredUrls: urls.length,
      productUrlsFound: targetUrls.length,
      ingestedCount: syncResult.upsertedCount + syncResult.modifiedCount,
      message: `Successfully crawled sitemap and processed ${targetUrls.length} product URLs.`,
    };
  }
}
