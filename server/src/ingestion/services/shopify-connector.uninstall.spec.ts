import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';

import { ShopifyConnectorService } from './shopify-connector.service';
import { ProductsService } from '../../products/products.service';
import { RedisService } from '../../common/redis/redis.service';
import { Business } from '../../users/schemas/business.schema';
import { shopifyTokenServiceProvider } from '../../common/shopify-token/shopify-token.testing';

/**
 * `app/uninstalled` used to fall through to the `default` branch and only log
 * `Unhandled topic`, which left a dead encrypted access token at rest and a
 * tenant whose API keys still authenticated.
 */
describe('ShopifyConnectorService app/uninstalled', () => {
  let service: ShopifyConnectorService;
  let businessModel: { updateOne: jest.Mock };
  let redisClient: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    businessModel = {
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    redisClient = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyConnectorService,
        shopifyTokenServiceProvider(),
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: ProductsService, useValue: {} },
        { provide: RedisService, useValue: { getClient: () => redisClient } },
        { provide: getModelToken(Business.name), useValue: businessModel },
      ],
    }).compile();

    service = module.get<ShopifyConnectorService>(ShopifyConnectorService);
  });

  it('clears the access token and suspends the tenant', async () => {
    const result = await service.processWebhook(
      'biz-1',
      'app/uninstalled',
      'wh-1',
      { domain: 'demo-store.myshopify.com' },
    );

    expect(result).toEqual({ status: 'processed', topic: 'app/uninstalled' });

    const [filter, update] = businessModel.updateOne.mock.calls[0];
    expect(filter._id).toBe('biz-1');
    expect(update.$unset).toHaveProperty('shopifyAccessToken');
    expect(update.$set.status).toBe('suspended');
    expect(update.$set.keyStatus).toBe('suspended');
    expect(update.$set.connectedPlatform).toBe('none');
    expect(update.$set.shopifyUninstalledAt).toBeInstanceOf(Date);
  });

  it('keeps the dedupe guarantee for a repeated uninstall delivery', async () => {
    redisClient.get.mockResolvedValue('1');

    const result = await service.processWebhook(
      'biz-1',
      'app/uninstalled',
      'wh-1',
      {},
    );

    expect(result).toEqual({ status: 'duplicate_skipped' });
    expect(businessModel.updateOne).not.toHaveBeenCalled();
  });

  it('does not delete catalog data — that is shop/redact', async () => {
    // Shopify sends shop/redact 48 hours later. A reinstall before then must
    // find the merchant's catalog intact.
    await service.processWebhook('biz-1', 'app/uninstalled', 'wh-2', {});

    const [, update] = businessModel.updateOne.mock.calls[0];
    expect(Object.keys(update)).toEqual(
      expect.arrayContaining(['$set', '$unset']),
    );
    expect(update.$unset).toEqual({ shopifyAccessToken: '' });
  });
});
