import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { IngestionController } from './ingestion.controller';
import { ShopifyConnectorService } from './services/shopify-connector.service';
import { WooCommerceConnectorService } from './services/woocommerce-connector.service';
import { FeedParserService } from './services/feed-parser.service';
import { SitemapCrawlerService } from './services/sitemap-crawler.service';
import { ManualConnectorService } from './services/manual-connector.service';
import { FileIngestionService } from './services/file-ingestion.service';
import { DomSemanticStructurerService } from './services/dom-semantic-structurer.service';
import { RedisService } from '../common/redis/redis.service';
import { Business } from '../users/schemas/business.schema';

describe('IngestionController -- platform webhooks', () => {
  let controller: IngestionController;
  let mockShopifyService: any;
  let mockWooService: any;
  let mockBusinessModel: any;

  const mockBusinessId = '671234567890123456789012';
  const rawBody = Buffer.from('{"id":1}');

  const req = () => ({ rawBody }) as any;

  /** Mongoose queries here are used both bare and with .select(). */
  const mockQuery = (result: any) => {
    const query: any = { exec: jest.fn().mockResolvedValue(result) };
    query.select = jest.fn().mockReturnValue(query);
    return query;
  };

  beforeEach(async () => {
    mockShopifyService = {
      verifyWebhookHmac: jest.fn().mockReturnValue(true),
      processWebhook: jest.fn().mockResolvedValue({ synced: 1 }),
    };

    mockWooService = {
      verifyWebhookHmac: jest.fn().mockReturnValue(true),
      syncProducts: jest.fn().mockResolvedValue({ synced: 1 }),
    };

    mockBusinessModel = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        { provide: ShopifyConnectorService, useValue: mockShopifyService },
        { provide: WooCommerceConnectorService, useValue: mockWooService },
        { provide: FeedParserService, useValue: {} },
        { provide: SitemapCrawlerService, useValue: {} },
        { provide: DomSemanticStructurerService, useValue: {} },
        { provide: ManualConnectorService, useValue: {} },
        { provide: FileIngestionService, useValue: {} },
        { provide: getModelToken(Business.name), useValue: mockBusinessModel },
        // ApiKeyGuard on the sibling widget routes is instantiated with the controller.
        { provide: RedisService, useValue: { getClient: () => ({}) } },
      ],
    }).compile();

    controller = module.get<IngestionController>(IngestionController);
  });

  const callShopify = (
    overrides: {
      hmac?: string;
      domain?: string;
      payload?: any;
      request?: any;
    } = {},
  ) =>
    controller.handlePlatformWebhook(
      'shopify',
      'products/update',
      'wh_1',
      overrides.hmac ?? 'valid_hmac',
      overrides.domain ?? 'store.myshopify.com',
      undefined as any,
      undefined as any,
      overrides.request ?? req(),
      overrides.payload ?? { id: 1 },
    );

  it('rejects an invalid Shopify HMAC outside production', async () => {
    process.env.NODE_ENV = 'development';
    mockShopifyService.verifyWebhookHmac.mockReturnValue(false);

    await expect(callShopify()).rejects.toThrow(UnauthorizedException);
    expect(mockShopifyService.processWebhook).not.toHaveBeenCalled();
  });

  it('rejects an invalid WooCommerce signature outside production', async () => {
    process.env.NODE_ENV = 'development';
    mockWooService.verifyWebhookHmac.mockReturnValue(false);
    mockBusinessModel.findOne.mockReturnValue(
      mockQuery({
        _id: { toString: () => mockBusinessId },
        woocommerceWebhookSecret: undefined,
      }),
    );

    await expect(
      controller.handlePlatformWebhook(
        'woocommerce',
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        'bad_signature',
        'https://store.example.com',
        req(),
        { id: 1 },
      ),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockWooService.syncProducts).not.toHaveBeenCalled();
  });

  it('refuses to verify when the raw body is unavailable', async () => {
    await expect(callShopify({ request: {} as any })).rejects.toThrow(
      BadRequestException,
    );
    expect(mockShopifyService.verifyWebhookHmac).not.toHaveBeenCalled();
  });

  it('resolves the tenant from the shop domain', async () => {
    mockBusinessModel.findOne.mockReturnValue(
      mockQuery({ _id: { toString: () => mockBusinessId } }),
    );

    await callShopify();

    expect(mockShopifyService.processWebhook).toHaveBeenCalledWith(
      mockBusinessId,
      'products/update',
      'wh_1',
      { id: 1 },
    );
  });

  it('verifies a WooCommerce webhook against the store\'s own secret', async () => {
    mockBusinessModel.findOne.mockReturnValue(
      mockQuery({
        _id: { toString: () => mockBusinessId },
        woocommerceWebhookSecret: 'per_store_secret',
      }),
    );

    await controller.handlePlatformWebhook(
      'woocommerce',
      undefined as any,
      undefined as any,
      undefined as any,
      undefined as any,
      'valid_signature',
      'https://store.example.com',
      req(),
      { id: 1 },
    );

    expect(mockWooService.verifyWebhookHmac).toHaveBeenCalledWith(
      rawBody,
      'valid_signature',
      'per_store_secret',
    );
    expect(mockWooService.syncProducts).toHaveBeenCalledWith(mockBusinessId, [
      { id: 1 },
    ]);
  });

  it('ignores a businessId in the payload when the domain is unknown', async () => {
    mockBusinessModel.findOne.mockReturnValue(mockQuery(null));

    await expect(
      callShopify({ payload: { id: 1, businessId: 'other_business_id_999' } }),
    ).rejects.toThrow(BadRequestException);
    expect(mockShopifyService.processWebhook).not.toHaveBeenCalled();
  });

  it('ignores a businessId in the payload on the WooCommerce path', async () => {
    mockBusinessModel.findOne.mockReturnValue(mockQuery(null));

    await expect(
      controller.handlePlatformWebhook(
        'woocommerce',
        undefined as any,
        undefined as any,
        undefined as any,
        undefined as any,
        'valid_signature',
        'https://unknown.example.com',
        req(),
        { id: 1, businessId: 'other_business_id_999' },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockWooService.syncProducts).not.toHaveBeenCalled();
  });
});
