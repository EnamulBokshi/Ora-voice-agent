import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';

import { ShopifyService } from './shopify.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import { Business } from '../users/schemas/business.schema';
import { AdminUser } from '../users/schemas/admin-user.schema';
import { SHOPIFY_SYNC_QUEUE } from './shopify.constants';
import { shopifyTokenServiceProvider } from '../common/shopify-token/shopify-token.testing';

const API_KEY = 'test-client-id';
const API_SECRET = 'test-client-secret';
const SHOP = 'demo-store.myshopify.com';

/** Mints an App Bridge-shaped session token so claim handling can be tested. */
const signToken = (
  claims: Record<string, unknown>,
  secret = API_SECRET,
  alg = 'HS256',
) => {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  const header = encode({ alg, typ: 'JWT' });
  const payload = encode(claims);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
};

const validClaims = (overrides: Record<string, unknown> = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: `https://${SHOP}/admin`,
    dest: `https://${SHOP}/admin`,
    aud: API_KEY,
    sub: '42',
    exp: now + 60,
    nbf: now - 10,
    iat: now - 10,
    jti: 'jti-1',
    sid: 'sid-1',
    ...overrides,
  };
};

describe('ShopifyService', () => {
  let service: ShopifyService;

  beforeEach(async () => {
    const config: Record<string, string> = {
      SHOPIFY_API_KEY: API_KEY,
      SHOPIFY_API_SECRET: API_SECRET,
      SHOPIFY_APP_URL: 'https://app.ora.test',
      SHOPIFY_SCOPES: 'read_products,write_products',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyService,
        shopifyTokenServiceProvider(),
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
        { provide: AuthService, useValue: { issueSessionForUser: jest.fn() } },
        { provide: UsersService, useValue: { findByEmail: jest.fn() } },
        {
          provide: RedisService,
          useValue: {
            acquireLock: jest.fn(),
            releaseLock: jest.fn(),
            setSingleUseValue: jest.fn(),
            consumeSingleUseValue: jest.fn(),
          },
        },
        { provide: getModelToken(Business.name), useValue: {} },
        { provide: getModelToken(AdminUser.name), useValue: {} },
        { provide: getQueueToken(SHOPIFY_SYNC_QUEUE), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<ShopifyService>(ShopifyService);
  });

  describe('verifySessionToken', () => {
    it('accepts a token whose every claim is valid', () => {
      const claims = service.verifySessionToken(signToken(validClaims()));
      expect(claims.aud).toBe(API_KEY);
      expect(service.shopFromClaims(claims)).toBe(SHOP);
    });

    it('rejects a token signed with a different secret', () => {
      expect(() =>
        service.verifySessionToken(signToken(validClaims(), 'other-secret')),
      ).toThrow('The Shopify session token is invalid.');
    });

    it('rejects a validly signed token minted for another app', () => {
      // Same Partner account, so the signature verifies; only `aud` separates
      // this app's tokens from a sibling app's.
      expect(() =>
        service.verifySessionToken(signToken(validClaims({ aud: 'other-app' }))),
      ).toThrow('The Shopify session token is invalid.');
    });

    it('rejects a token replayed after it expires', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(() =>
        service.verifySessionToken(
          signToken(validClaims({ exp: now - 120, nbf: now - 240 })),
        ),
      ).toThrow('The Shopify session token is invalid.');
    });

    it('rejects a token that is not yet valid', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(() =>
        service.verifySessionToken(
          signToken(validClaims({ nbf: now + 300, exp: now + 600 })),
        ),
      ).toThrow('The Shopify session token is invalid.');
    });

    it('rejects a token whose dest and iss identify different shops', () => {
      expect(() =>
        service.verifySessionToken(
          signToken(validClaims({ iss: 'https://other-store.myshopify.com/admin' })),
        ),
      ).toThrow('The Shopify session token is invalid.');
    });

    it('rejects an unsigned token rather than trusting its claims', () => {
      const encode = (value: unknown) =>
        Buffer.from(JSON.stringify(value)).toString('base64url');
      const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(
        validClaims(),
      )}.`;

      expect(() => service.verifySessionToken(unsigned)).toThrow(
        'The Shopify session token is invalid.',
      );
    });

    it('rejects a malformed token without throwing a RangeError', () => {
      expect(() => service.verifySessionToken('not-a-jwt')).toThrow(
        'The Shopify session token is invalid.',
      );
    });

    it('rejects a missing token', () => {
      expect(() => service.verifySessionToken('')).toThrow(
        'A Shopify session token is required.',
      );
    });
  });

  describe('normalizeShopDomain', () => {
    it.each([
      ['https://demo-store.myshopify.com', SHOP],
      ['demo-store.myshopify.com/admin', SHOP],
      ['DEMO-STORE.MYSHOPIFY.COM', SHOP],
      ['  demo-store.myshopify.com  ', SHOP],
    ])('normalizes %s', (input, expected) => {
      expect(service.normalizeShopDomain(input)).toBe(expected);
    });

    it.each([
      'evil.example.com',
      'demo-store.myshopify.com.evil.com',
      'not a domain',
      '',
    ])('rejects %s so it cannot become an outbound request host', (input) => {
      expect(() => service.normalizeShopDomain(input)).toThrow(
        'A shop must be a <store>.myshopify.com domain.',
      );
    });
  });

  describe('verifyQueryHmac', () => {
    const signQuery = (params: Record<string, string>, secret = API_SECRET) => {
      const message = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');
      return crypto.createHmac('sha256', secret).update(message).digest('hex');
    };

    it('accepts a correctly signed callback query', () => {
      const params = { code: 'abc', shop: SHOP, state: 'nonce', timestamp: '1' };
      const query = new URLSearchParams({
        ...params,
        hmac: signQuery(params),
      }).toString();

      expect(service.verifyQueryHmac(query)).toBe(true);
    });

    it('accepts a query carrying a parameter Shopify added later', () => {
      // The global ValidationPipe would reject an unlisted parameter, which is
      // why this route reads the raw query instead of a DTO. The signature must
      // still cover the extra parameter.
      const params = {
        code: 'abc',
        host: 'YWRtaW4=',
        shop: SHOP,
        state: 'nonce',
        timestamp: '1',
      };
      const query = new URLSearchParams({
        ...params,
        hmac: signQuery(params),
      }).toString();

      expect(service.verifyQueryHmac(query)).toBe(true);
    });

    it('rejects a tampered query', () => {
      const params = { code: 'abc', shop: SHOP, state: 'nonce' };
      const query = new URLSearchParams({
        ...params,
        shop: 'attacker.myshopify.com',
        hmac: signQuery(params),
      }).toString();

      expect(service.verifyQueryHmac(query)).toBe(false);
    });

    it('rejects a query signed with a different secret', () => {
      const params = { code: 'abc', shop: SHOP };
      const query = new URLSearchParams({
        ...params,
        hmac: signQuery(params, 'wrong'),
      }).toString();

      expect(service.verifyQueryHmac(query)).toBe(false);
    });

    it('rejects a query with no hmac at all', () => {
      expect(service.verifyQueryHmac('shop=demo-store.myshopify.com')).toBe(false);
    });

    it('rejects a short hmac without throwing a RangeError', () => {
      const query = `shop=${SHOP}&hmac=abcd`;
      expect(() => service.verifyQueryHmac(query)).not.toThrow();
      expect(service.verifyQueryHmac(query)).toBe(false);
    });
  });

  describe('token exchange failures', () => {
    const SESSION_TOKEN =
      'eyJhbGciOiJIUzI1NiJ9.eyJkZXN0IjoiaHR0cHM6Ly9kZW1vIn0.c2lnbmF0dXJl';

    afterEach(() => jest.restoreAllMocks());

    // Shopify can echo the request back on a rejected exchange, and the
    // request carries the session token as `subject_token` plus the app's
    // client secret. Neither may reach a log line or the client.
    const rejectWith = (body: string) =>
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => body,
      } as any);

    it('keeps the raw error body out of the exception message', async () => {
      rejectWith(
        JSON.stringify({
          error: 'invalid_subject_token',
          subject_token: SESSION_TOKEN,
          client_secret: API_SECRET,
        }),
      );

      await expect(
        service.exchangeSessionToken(SHOP, SESSION_TOKEN),
      ).rejects.toThrow('Shopify rejected the token exchange.');
    });

    it('keeps the session token and the client secret out of the log', async () => {
      rejectWith(`subject_token=${SESSION_TOKEN}&client_secret=${API_SECRET}`);
      const logged = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.exchangeSessionToken(SHOP, SESSION_TOKEN),
      ).rejects.toThrow();

      const line = logged.mock.calls[0][0] as string;
      expect(line).toContain('HTTP 400');
      expect(line).not.toContain(SESSION_TOKEN);
      expect(line).not.toContain(API_SECRET);
    });

    it('redacts the authorization code path the same way', async () => {
      rejectWith(JSON.stringify({ error: 'invalid_request', code: 'the-code' }));

      await expect(service.exchangeCode(SHOP, 'the-code')).rejects.toThrow(
        'Shopify rejected the authorization code.',
      );
    });
  });

});
