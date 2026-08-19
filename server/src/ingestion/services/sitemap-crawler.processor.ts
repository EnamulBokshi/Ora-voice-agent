import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { JsonLdExtractor } from '../extractors/json-ld.extractor';
import { ReadabilityExtractor } from '../extractors/readability.extractor';
import { CrawlUrlJobData } from '../types/ingestion.types';
import { ProductsService } from '../../products/products.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { ProductAvailability, SourceTier } from '../../products/schemas/product.schema';

export const HTML_CRAWL_QUEUE = 'ora-html-crawl';
const USER_AGENT = 'ORA-Sync/1.0 (+https://ora.ai/bot; Storefront Intelligence)';
const FETCH_TIMEOUT_MS = 10000;

/**
 * Worker processor for the generic crawl and secondary policy/FAQ sweeps.
 * Uses a global rate limiter of 5 fetches/sec to remain polite to merchant origin servers.
 */
@Processor(HTML_CRAWL_QUEUE, {
  concurrency: 5,
  limiter: { max: 5, duration: 1000 },
})
export class SitemapCrawlerProcessor extends WorkerHost {
  private readonly logger = new Logger(SitemapCrawlerProcessor.name);

  constructor(
    private readonly jsonLdExtractor: JsonLdExtractor,
    private readonly readabilityExtractor: ReadabilityExtractor,
    private readonly productsService: ProductsService,
    private readonly knowledgeService: KnowledgeService,
  ) {
    super();
  }

  async process(job: Job<CrawlUrlJobData>): Promise<void> {
    const { businessId, discovered } = job.data;
    const html = await this.fetchHtml(discovered.url);

    if (!html) {
      this.logger.debug(`[SitemapCrawlerWorker] Skipping ${discovered.url}: fetch failed or non-HTML`);
      return;
    }

    let productIngested = false;

    // 1. Attempt product extraction (JSON-LD, OpenGraph, or semantic HTML)
    const product = this.jsonLdExtractor.extractProduct(html, discovered.url);
    if (product && (discovered.kind === 'product' || product.price !== undefined || product.title !== 'Untitled product')) {
      const availability =
        product.availability === 'in_stock'
          ? ProductAvailability.IN_STOCK
          : product.availability === 'out_of_stock'
            ? ProductAvailability.OUT_OF_STOCK
            : ProductAvailability.IN_STOCK;

      await this.productsService.batchSync(businessId, {
        sourceTier: SourceTier.TIER3_PASSIVE,
        products: [
          {
            nativeProductId:
              product.externalId || `url_${Buffer.from(discovered.url).toString('base64').substring(0, 16)}`,
            name: product.title,
            description: product.description || '',
            price: product.price || 0,
            currency: product.currency || 'USD',
            stockQuantity: product.availability === 'out_of_stock' ? 0 : 10,
            availability,
            category: 'General',
            images: product.images,
            attributes: { sourceUrl: product.sourceUrl, contentHash: product.contentHash },
            sourceTier: SourceTier.TIER3_PASSIVE,
            confidenceScore: 0.3,
          },
        ],
      });

      this.logger.log(`[SitemapCrawlerWorker] Ingested product '${product.title}' for business ${businessId}`);
      productIngested = true;
    }

    // 2. Also extract text knowledge docs for policies, FAQs, pages, and blog posts
    if (discovered.kind !== 'product' || !productIngested) {
      const doc = this.readabilityExtractor.extract(
        html,
        discovered.url,
        discovered.kind,
      );
      if (doc) {
        await this.knowledgeService.upsertExtractedDoc(businessId, {
          title: doc.title,
          category: doc.category,
          markdown: doc.markdown,
          sourceUrl: doc.sourceUrl,
          contentHash: doc.contentHash,
        });

        this.logger.log(
          `[SitemapCrawlerWorker] Ingested knowledge doc '${doc.title}' (${doc.category}) for business ${businessId}`,
        );
      }
    }
  }

  private async fetchHtml(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      });

      if (!res.ok) return null;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return null;

      return await res.text();
    } catch (err: any) {
      this.logger.debug(`fetchHtml failed for ${url}: ${err.message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
