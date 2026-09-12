import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import * as crypto from 'crypto';

import { ShopifyService } from './shopify.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import { Business } from '../users/schemas/business.schema';
import { AdminUser } from '../users/schemas/admin-user.schema';
import { SHOPIFY_SYNC_QUEUE } from './shopify.constants';
import { shopifyTokenServiceProvider } from '../common/shopify-token/shopify-token.testing';

const API_KEY = 'client-id';
const API_SECRET = 'client-secret';
const SHOP = 'demo-store.myshopify.com';

const signToken = (secret = API_SECRET) => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    iss: `https://${SHOP}/admin`,
    dest: `https://${SHOP}/admin`,
    aud: API_KEY,
    sub: '1',
    exp: now + 60,
    nbf: now - 5,
    iat: now - 5,
    jti: 'j',
    sid: 's',
  });
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

/**
 * `POST /shopify/session` is called on every embedded page load, so the install
 * behind it must not run twice. Token exchange, webhook registration, and the
 * sync enqueue are all non-idempotent; the unique index on `shopifyShopDomain`
 * only protects the Business row.
 */
describe('ShopifyService install locking', () => {
  let service: ShopifyService;
  let redis: { acquireLock: jest.Mock; releaseLock: jest.Mock };
  let businessModel: { findOne: jest.Mock; findById: jest.Mock };
  let authService: { issueSessionForUser: jest.Mock };

  /**
   * One mock answers every read shape in this path: `.exec()`, `.sort().exec()`
   * for `resolveOwner`, and `.select().exec()` since `establishSession` now
   * asks for the encrypted access token so it can tell a legacy token from a
   * current one.
   */
  const chain = (result: unknown) => {
    const exec = jest.fn().mockResolvedValue(result);
    const self: any = { exec };
    self.sort = jest.fn().mockReturnValue({ exec });
    self.select = jest.fn().mockReturnValue(self);
    return self;
  };

  beforeEach(async () => {
    redis = {
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    };
    businessModel = {
      findOne: jest.fn().mockReturnValue(chain(null)),
      findById: jest.fn().mockReturnValue(chain(null)),
    };
    authService = {
      issueSessionForUser: jest.fn().mockResolvedValue({
        tokens: { accessToken: 'a', refreshToken: 'r' },
        sessionId: 'sess',
      }),
    };

    const config: Record<string, string> = {
      SHOPIFY_API_KEY: API_KEY,
      SHOPIFY_API_SECRET: API_SECRET,
      SHOPIFY_APP_URL: 'https://app.ora.test',
      SHOPIFY_SCOPES: 'read_products',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyService,
        shopifyTokenServiceProvider(),
        { provide: ConfigService, useValue: { get: (k: string) => config[k] } },
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: { findByEmail: jest.fn() } },
        { provide: RedisService, useValue: redis },
        { provide: getModelToken(Business.name), useValue: businessModel },
        {
          provide: getModelToken(AdminUser.name),
          useValue: {
            findOne: jest.fn().mockReturnValue(
              chain({
                _id: { toString: () => 'user-1' },
                email: 'owner@demo.test',
                name: 'Owner',
                role: 'owner',
                emailVerified: true,
              }),
            ),
          },
        },
        { provide: getQueueToken(SHOPIFY_SYNC_QUEUE), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<ShopifyService>(ShopifyService);
  });

  it('installs once and reports it, then reuses on the next page load', async () => {
    const installed = {
      _id: { toString: () => 'biz-1' },
      name: 'Demo Store',
      shopifyShopDomain: SHOP,
      shopifyScopes: ['read_products'],
    };

    const provision = jest
      .spyOn(service as any, 'provisionTenant')
      .mockResolvedValue(installed);
    jest.spyOn(service, 'exchangeSessionToken').mockResolvedValue({
      accessToken: 'shpat_x',
      scopes: ['read_products'],
    });

    const first = await service.establishSession(signToken());
    expect(first.installed).toBe(true);
    expect(provision).toHaveBeenCalledTimes(1);

    businessModel.findOne.mockReturnValue(chain(installed));

    const second = await service.establishSession(signToken());
    expect(second.installed).toBe(false);
    expect(provision).toHaveBeenCalledTimes(1);
  });

  it('does not install a second time when it loses the lock race', async () => {
    redis.acquireLock.mockResolvedValue(false);

    const installedByOther = {
      _id: { toString: () => 'biz-1' },
      name: 'Demo Store',
      shopifyShopDomain: SHOP,
      shopifyScopes: ['read_products'],
    };

    const provision = jest.spyOn(service as any, 'provisionTenant');
    jest
      .spyOn(service as any, 'waitForConcurrentInstall')
      .mockResolvedValue(installedByOther);

    const result = await service.establishSession(signToken());

    expect(provision).not.toHaveBeenCalled();
    expect(result.business.id).toBe('biz-1');
  });

  it('refuses rather than duplicating when the other install never lands', async () => {
    redis.acquireLock.mockResolvedValue(false);
    jest.spyOn(service as any, 'waitForConcurrentInstall').mockResolvedValue(null);

    await expect(service.establishSession(signToken())).rejects.toThrow(
      'This store is already being installed. Retry in a moment.',
    );
  });

  it('releases the lock even when provisioning throws', async () => {
    jest.spyOn(service, 'exchangeSessionToken').mockRejectedValue(
      new Error('shopify unavailable'),
    );

    await expect(service.establishSession(signToken())).rejects.toThrow(
      'shopify unavailable',
    );
    expect(redis.releaseLock).toHaveBeenCalled();
  });

  it('uses the tenant another request created between the read and the lock', async () => {
    const raced = {
      _id: { toString: () => 'biz-raced' },
      name: 'Demo Store',
      shopifyShopDomain: SHOP,
      shopifyScopes: ['read_products'],
    };

    const provision = jest.spyOn(service as any, 'provisionTenant');
    // First read misses, the read inside the lock hits.
    businessModel.findOne
      .mockReturnValueOnce(chain(null))
      .mockReturnValueOnce(chain(raced));

    const result = await service.establishSession(signToken());

    expect(provision).not.toHaveBeenCalled();
    expect(result.business.id).toBe('biz-raced');
  });
});
