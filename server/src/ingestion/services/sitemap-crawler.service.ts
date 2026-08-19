import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProductsService } from '../../products/products.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { PassiveIngestDto } from '../dto/passive-ingest.dto';
import { SourceTier, ProductAvailability } from '../../products/schemas/product.schema';
import { PlatformSnifferService } from './platform-sniffer.service';
import { PlatformFastPathService } from './platform-fast-path.service';
import { SitemapDiscoveryService } from './sitemap-discovery.service';
import { CrawlJobData, CrawlUrlJobData, DiscoveredUrl } from '../types/ingestion.types';
import { HTML_CRAWL_QUEUE } from './sitemap-crawler.processor';
import { UrlNormalizer } from '../utils/url-normalizer.util';

import { JsonLdExtractor } from '../extractors/json-ld.extractor';
import { ReadabilityExtractor } from '../extractors/readability.extractor';

@Injectable()
export class SitemapCrawlerService {
  private readonly logger = new Logger(SitemapCrawlerService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly knowledgeService: KnowledgeService,
    private readonly sniffer: PlatformSnifferService,
    private readonly fastPath: PlatformFastPathService,
    private readonly discovery: SitemapDiscoveryService,
    private readonly jsonLdExtractor: JsonLdExtractor,
    private readonly readabilityExtractor: ReadabilityExtractor,
    @InjectQueue(HTML_CRAWL_QUEUE) private readonly htmlCrawlQueue: Queue<CrawlUrlJobData>,
  ) {}

  /**
   * Passive Storefront Capture endpoint (called by storefront widget when a customer visits an item).
   */
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

  /**
   * Primary entry point for "Sync from Website URL".
   * Sniffs platform, executes fast paths if available, and queues deep sitemap crawls.
   */
  async syncFromWebsite({ businessId, domain }: CrawlJobData): Promise<{
    platform: string;
    productsIngested: number;
    knowledgeDocsIngested: number;
    htmlCrawlJobsQueued: number;
    message: string;
  }> {
    const normalizedDomain = UrlNormalizer.normalizeDomain(domain);
    if (!normalizedDomain) {
      throw new BadRequestException('A valid domain or website URL is required.');
    }

    const detection = await this.sniffer.detect(normalizedDomain);
    this.logger.log(
      `[SitemapCrawlerService] Platform detected for ${normalizedDomain} (business=${businessId}): ${detection.platform} (${detection.confidence})`,
    );

    if (detection.platform === 'shopify') {
      return this.runShopifyFastPath(businessId, detection.domain);
    }

    if (detection.platform === 'woocommerce') {
      return this.runWooCommerceFastPath(businessId, detection.domain);
    }

    return this.runGenericCrawl(businessId, detection.domain);
  }

  /**
   * Legacy sitemap crawl wrapper for backwards compatibility with existing routes.
   */
  async crawlSitemap(businessId: string, sitemapUrl: string) {
    let domain = sitemapUrl;
    try {
      domain = new URL(sitemapUrl).hostname;
    } catch {
      domain = sitemapUrl.replace(/^https?:\/\//, '').split('/')[0];
    }

    const result = await this.syncFromWebsite({ businessId, domain });
    return {
      sitemapUrl,
      discoveredUrls: result.htmlCrawlJobsQueued,
      productUrlsFound: result.productsIngested,
      ingestedCount: result.productsIngested + result.knowledgeDocsIngested,
      message: result.message,
    };
  }

  // ─── Fast Paths ─────────────────────────────────────────────────────────────

  private async runShopifyFastPath(businessId: string, domain: string) {
    const [products, policies] = await Promise.all([
      this.fastPath.fetchShopifyProducts(domain),
      this.fastPath.fetchShopifyPolicies(domain),
    ]);

    // 1. Batch sync products
    if (products.length > 0) {
      await this.productsService.batchSync(businessId, {
        sourceTier: SourceTier.TIER3_PASSIVE,
        products: products.map((p) => ({
          nativeProductId: p.externalId || `shp_${p.sourceUrl.split('/').pop()}`,
          name: p.title,
          description: p.description || '',
          price: p.price || 0,
          currency: p.currency || 'USD',
          stockQuantity: p.availability === 'out_of_stock' ? 0 : 10,
          availability:
            p.availability === 'out_of_stock'
              ? ProductAvailability.OUT_OF_STOCK
              : ProductAvailability.IN_STOCK,
          category: 'General',
          images: p.images,
          attributes: { sourceUrl: p.sourceUrl, contentHash: p.contentHash },
          sourceTier: SourceTier.TIER3_PASSIVE,
          confidenceScore: 0.7,
        })),
      });
    }

    // 2. Ingest policies
    let policiesIngested = 0;
    for (const policy of policies) {
      await this.knowledgeService.upsertExtractedDoc(businessId, {
        title: policy.title,
        category: policy.category,
        markdown: policy.markdown,
        sourceUrl: policy.sourceUrl,
        contentHash: policy.contentHash,
      });
      policiesIngested++;
    }

    // 3. Queue secondary sitemap crawl for non-policy FAQs/pages
    const discovered = await this.discovery.discover(domain);
    const faqAndPageUrls = discovered.filter((d) => d.kind === 'faq' || d.kind === 'page');
    const queued = await this.enqueueHtmlCrawl(businessId, domain, 'shopify', faqAndPageUrls);

    return {
      platform: 'shopify',
      productsIngested: products.length,
      knowledgeDocsIngested: policiesIngested,
      htmlCrawlJobsQueued: queued,
      message: `Successfully fast-synced ${products.length} Shopify products and ${policiesIngested} policies. Queued ${queued} FAQ/page links.`,
    };
  }

  private async runWooCommerceFastPath(businessId: string, domain: string) {
    const [products, pages] = await Promise.all([
      this.fastPath.fetchWooCommerceProducts(domain),
      this.fastPath.fetchWooCommercePages(domain),
    ]);

    // 1. Ingest products
    if (products.length > 0) {
      await this.productsService.batchSync(businessId, {
        sourceTier: SourceTier.TIER3_PASSIVE,
        products: products.map((p) => ({
          nativeProductId: p.externalId || `wc_${p.sourceUrl.split('/').pop()}`,
          name: p.title,
          description: p.description || '',
          price: p.price || 0,
          currency: p.currency || 'USD',
          stockQuantity: p.availability === 'out_of_stock' ? 0 : 10,
          availability:
            p.availability === 'out_of_stock'
              ? ProductAvailability.OUT_OF_STOCK
              : ProductAvailability.IN_STOCK,
          category: 'General',
          images: p.images,
          attributes: { sourceUrl: p.sourceUrl, contentHash: p.contentHash },
          sourceTier: SourceTier.TIER3_PASSIVE,
          confidenceScore: 0.7,
        })),
      });
    }

    // 2. Queue WordPress pages for Readability markdown cleaning & chunking
    const pageUrls: DiscoveredUrl[] = pages.map((p) => ({
      url: p.sourceUrl,
      kind: p.category === 'general' ? 'page' : p.category,
      sourceHint: 'platform-index',
    }));
    const queued = await this.enqueueHtmlCrawl(businessId, domain, 'woocommerce', pageUrls);

    return {
      platform: 'woocommerce',
      productsIngested: products.length,
      knowledgeDocsIngested: 0,
      htmlCrawlJobsQueued: queued,
      message: `Successfully fast-synced ${products.length} WooCommerce products. Queued ${queued} WordPress pages for knowledge extraction.`,
    };
  }

  // ─── Generic Crawl ─────────────────────────────────────────────────────────

  private async runGenericCrawl(businessId: string, domain: string) {
    const discovered = await this.discovery.discover(domain);

    if (discovered.length === 0) {
      return {
        platform: 'custom',
        productsIngested: 0,
        knowledgeDocsIngested: 0,
        htmlCrawlJobsQueued: 0,
        message: `No public sitemap detected for ${domain}. Please verify the domain or upload a catalog file.`,
      };
    }

    // Direct inline crawl for priority pages (up to 15) for instant dashboard availability
    const priorityUrls = discovered.slice(0, 15);
    const backgroundUrls = discovered.slice(15);

    let productsIngested = 0;
    let knowledgeDocsIngested = 0;

    for (const item of priorityUrls) {
      const outcome = await this.crawlUrlDirectly(businessId, item);
      if (outcome.isProduct) productsIngested += 1;
      if (outcome.isDoc) knowledgeDocsIngested += 1;
    }

    const queued = await this.enqueueHtmlCrawl(businessId, domain, 'custom', backgroundUrls);

    return {
      platform: 'custom',
      productsIngested,
      knowledgeDocsIngested,
      htmlCrawlJobsQueued: queued,
      message: `Successfully indexed ${productsIngested} product(s) & ${knowledgeDocsIngested} knowledge document(s) from ${domain}${queued > 0 ? `. Queued ${queued} more in background.` : '.'}`,
    };
  }

  private async crawlUrlDirectly(
    businessId: string,
    discovered: DiscoveredUrl,
  ): Promise<{ isProduct: boolean; isDoc: boolean }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(discovered.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ORA-Sync/1.0 (+https://ora.ai/bot)', Accept: 'text/html' },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) return { isProduct: false, isDoc: false };
      const html = await res.text();

      let isProduct = false;
      let isDoc = false;

      // 1. Product extraction
      const product = this.jsonLdExtractor.extractProduct(html, discovered.url);
      if (
        product &&
        (discovered.kind === 'product' || product.price !== undefined || product.title !== 'Untitled product')
      ) {
        await this.productsService.batchSync(businessId, {
          sourceTier: SourceTier.TIER3_PASSIVE,
          products: [
            {
              nativeProductId:
                product.externalId ||
                `url_${Buffer.from(discovered.url).toString('base64').substring(0, 16)}`,
              name: product.title,
              description: product.description || '',
              price: product.price || 0,
              currency: product.currency || 'USD',
              stockQuantity: product.availability === 'out_of_stock' ? 0 : 10,
              availability:
                product.availability === 'out_of_stock'
                  ? ProductAvailability.OUT_OF_STOCK
                  : ProductAvailability.IN_STOCK,
              category: 'General',
              images: product.images,
              attributes: { sourceUrl: product.sourceUrl, contentHash: product.contentHash },
              sourceTier: SourceTier.TIER3_PASSIVE,
              confidenceScore: 0.3,
            },
          ],
        });
        isProduct = true;
      }

      // 2. Knowledge extraction
      if (discovered.kind !== 'product' || !isProduct) {
        const doc = this.readabilityExtractor.extract(html, discovered.url, discovered.kind);
        if (doc) {
          await this.knowledgeService.upsertExtractedDoc(businessId, {
            title: doc.title,
            category: doc.category,
            markdown: doc.markdown,
            sourceUrl: doc.sourceUrl,
            contentHash: doc.contentHash,
          });
          isDoc = true;
        }
      }

      return { isProduct, isDoc };
    } catch (err: any) {
      this.logger.debug(`Direct crawl failed for ${discovered.url}: ${err.message}`);
      return { isProduct: false, isDoc: false };
    }
  }

  private async enqueueHtmlCrawl(
    businessId: string,
    domain: string,
    platform: CrawlUrlJobData['platform'],
    urls: DiscoveredUrl[],
  ): Promise<number> {
    if (urls.length === 0) return 0;

    await this.htmlCrawlQueue.addBulk(
      urls.map((discovered) => ({
        name: 'crawl-url',
        data: { businessId, domain, platform, discovered },
        opts: {
          removeOnComplete: 1000,
          removeOnFail: 500,
        },
      })),
    );

    return urls.length;
  }
}
