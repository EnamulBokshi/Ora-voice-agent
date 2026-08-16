import { Test, TestingModule } from '@nestjs/testing';
import { SitemapCrawlerService } from './sitemap-crawler.service';
import { PlatformSnifferService } from './platform-sniffer.service';
import { PlatformFastPathService } from './platform-fast-path.service';
import { SitemapDiscoveryService } from './sitemap-discovery.service';
import { ProductsService } from '../../products/products.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { getQueueToken } from '@nestjs/bullmq';
import { HTML_CRAWL_QUEUE } from './sitemap-crawler.processor';
import { UrlNormalizer } from '../utils/url-normalizer.util';
import { ContentHasher } from '../utils/content-hasher.util';

describe('SitemapCrawler & Ingestion Suite', () => {
  let service: SitemapCrawlerService;

  const mockProductsService = {
    batchSync: jest.fn().mockResolvedValue({ upsertedCount: 2, modifiedCount: 0 }),
  };

  const mockKnowledgeService = {
    upsertExtractedDoc: jest.fn().mockResolvedValue({ document: {}, updated: true, chunksCount: 3 }),
  };

  const mockSniffer = {
    detect: jest.fn(),
  };

  const mockFastPath = {
    fetchShopifyProducts: jest.fn(),
    fetchShopifyPolicies: jest.fn(),
    fetchWooCommerceProducts: jest.fn(),
    fetchWooCommercePages: jest.fn(),
  };

  const mockDiscovery = {
    discover: jest.fn(),
  };

  const mockQueue = {
    addBulk: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitemapCrawlerService,
        { provide: ProductsService, useValue: mockProductsService },
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: PlatformSnifferService, useValue: mockSniffer },
        { provide: PlatformFastPathService, useValue: mockFastPath },
        { provide: SitemapDiscoveryService, useValue: mockDiscovery },
        { provide: getQueueToken(HTML_CRAWL_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<SitemapCrawlerService>(SitemapCrawlerService);
  });

  describe('Deduplication Utilities', () => {
    it('UrlNormalizer should strip tracking query parameters and canonicalize URLs', () => {
      const dirtyUrl = 'https://www.example.com/products/item-1/?utm_source=google&fbclid=12345#overview';
      const cleanUrl = UrlNormalizer.normalizeUrl(dirtyUrl);
      expect(cleanUrl).toBe('https://example.com/products/item-1');
    });

    it('ContentHasher should generate consistent hashes for identical payloads', () => {
      const hash1 = ContentHasher.hashText('Refund Policy text 123');
      const hash2 = ContentHasher.hashText('Refund Policy text 123');
      const hash3 = ContentHasher.hashText('Different text');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('Shopify Fast Path Ingestion', () => {
    it('should fetch Shopify products and policies and queue non-policy pages', async () => {
      mockSniffer.detect.mockResolvedValue({
        platform: 'shopify',
        domain: 'myshopify-store.com',
        confidence: 'high',
      });

      mockFastPath.fetchShopifyProducts.mockResolvedValue([
        {
          sourceUrl: 'https://myshopify-store.com/products/shirt',
          externalId: '101',
          title: 'Oxford Shirt',
          price: 45,
          images: [],
          availability: 'in_stock',
        },
      ]);

      mockFastPath.fetchShopifyPolicies.mockResolvedValue([
        {
          sourceUrl: 'https://myshopify-store.com/policies/refund',
          category: 'policy',
          title: 'Refund Policy',
          markdown: 'All sales final within 30 days.',
        },
      ]);

      mockDiscovery.discover.mockResolvedValue([
        { url: 'https://myshopify-store.com/pages/faq', kind: 'faq' },
      ]);

      const result = await service.syncFromWebsite({
        businessId: 'biz_123',
        domain: 'myshopify-store.com',
      });

      expect(result.platform).toBe('shopify');
      expect(result.productsIngested).toBe(1);
      expect(result.knowledgeDocsIngested).toBe(1);
      expect(mockProductsService.batchSync).toHaveBeenCalled();
      expect(mockKnowledgeService.upsertExtractedDoc).toHaveBeenCalled();
    });
  });
});
