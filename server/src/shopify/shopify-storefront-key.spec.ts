import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';

import { ShopifyService } from './shopify.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { AdminUser } from '../users/schemas/admin-user.schema';
import {
  SHOPIFY_STOREFRONT_KEY_METAFIELD,
  SHOPIFY_SYNC_QUEUE,
} from './shopify.constants';
import { shopifyTokenServiceProvider } from '../common/shopify-token/shopify-token.testing';

const SHOP = 'demo-store.myshopify.com';
const KEY = 'biz_live_0123456789abcdef01234567';
const TOKEN = 'shppa_token';

/**
 * The theme app extension reads the publishable key out of an app-owned
 * metafield, so this write is the difference between a merchant switching the
 * app embed on and being done, and a merchant hunting for a key to paste.
 *
 * It is also the difference between a failed install and a widget that appears
 * one page load late, which is why every test here asserts that nothing
 * throws.
 */
describe('ShopifyService storefront key publishing', () => {
  let service: ShopifyService;
  let fetchMock: jest.Mock;

  const businessDoc = (
    overrides: Partial<BusinessDocument> = {},
  ): BusinessDocument =>
    ({
      _id: 'biz-1',
      publishableKey: KEY,
      shopifyShopDomain: SHOP,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as unknown as BusinessDocument;

  const graphqlResponse = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
  });

  beforeEach(async () => {
    const config: Record<string, string> = {
      SHOPIFY_API_KEY: 'client-id',
      SHOPIFY_API_SECRET: 'client-secret',
      ORA_API_URL: 'https://api.ora.test',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyService,
        shopifyTokenServiceProvider(),
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
        { provide: AuthService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: getModelToken(Business.name), useValue: {} },
        { provide: getModelToken(AdminUser.name), useValue: {} },
        { provide: getQueueToken(SHOPIFY_SYNC_QUEUE), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<ShopifyService>(ShopifyService);

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes the key into the app-owned metafield the extension reads', async () => {
    fetchMock
      .mockResolvedValueOnce(
        graphqlResponse({
          data: { currentAppInstallation: { id: 'gid://shopify/AppInstallation/9' } },
        }),
      )
      .mockResolvedValueOnce(
        graphqlResponse({ data: { metafieldsSet: { userErrors: [] } } }),
      );

    const business = businessDoc();
    await service.syncStorefrontKey(business, TOKEN);

    const [, init] = fetchMock.mock.calls[1];
    const variables = JSON.parse(init.body).variables;

    // The namespace and key are the Liquid contract. `app.metafields.ora
    // .publishable_key` in the block resolves to exactly these, and a change
    // on either side blanks the widget on every storefront without an error.
    expect(variables.metafields[0]).toEqual({
      ownerId: 'gid://shopify/AppInstallation/9',
      namespace: SHOPIFY_STOREFRONT_KEY_METAFIELD.namespace,
      key: SHOPIFY_STOREFRONT_KEY_METAFIELD.key,
      type: SHOPIFY_STOREFRONT_KEY_METAFIELD.type,
      value: KEY,
    });

    expect(business.shopifyStorefrontKeySyncedValue).toBe(KEY);
    expect(business.save).toHaveBeenCalled();
  });

  it('spends no Admin API call when the metafield already holds this key', async () => {
    const business = businessDoc({ shopifyStorefrontKeySyncedValue: KEY });

    await service.syncStorefrontKey(business, TOKEN);

    // This runs from the session exchange, which the embedded app calls on
    // every page load. Without the skip it is two round trips per load.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('republishes after the publishable key is rotated', async () => {
    fetchMock
      .mockResolvedValueOnce(
        graphqlResponse({
          data: { currentAppInstallation: { id: 'gid://shopify/AppInstallation/9' } },
        }),
      )
      .mockResolvedValueOnce(
        graphqlResponse({ data: { metafieldsSet: { userErrors: [] } } }),
      );

    const business = businessDoc({
      shopifyStorefrontKeySyncedValue: 'biz_live_anoldrotatedkeyvalue000000',
    });

    await service.syncStorefrontKey(business, TOKEN);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(business.shopifyStorefrontKeySyncedValue).toBe(KEY);
  });

  it('does not record a write that Shopify rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(
        graphqlResponse({
          data: { currentAppInstallation: { id: 'gid://shopify/AppInstallation/9' } },
        }),
      )
      .mockResolvedValueOnce(
        graphqlResponse({
          data: {
            metafieldsSet: {
              userErrors: [{ field: ['metafields'], message: 'Namespace is invalid' }],
            },
          },
        }),
      );

    const business = businessDoc();

    await expect(service.syncStorefrontKey(business, TOKEN)).resolves.toBeUndefined();

    // A userError arrives inside a 200. Recording it would mark the store
    // synced and stop every later attempt from retrying.
    expect(business.shopifyStorefrontKeySyncedValue).toBeUndefined();
    expect(business.save).not.toHaveBeenCalled();
  });

  it('never fails the install when the Admin API is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));

    const business = businessDoc();

    // provisionTenant awaits this after the tenant, its owner and its webhooks
    // already exist. Throwing here would abandon a store that is installed.
    await expect(service.syncStorefrontKey(business, TOKEN)).resolves.toBeUndefined();
    expect(business.shopifyStorefrontKeySyncedValue).toBeUndefined();
  });

  it('does nothing for a tenant that has no publishable key', async () => {
    const business = businessDoc({ publishableKey: null });

    await service.syncStorefrontKey(business, TOKEN);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
