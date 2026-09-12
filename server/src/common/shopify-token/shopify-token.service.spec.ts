import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';

import { ShopifyTokenService } from './shopify-token.service';
import { Business } from '../../users/schemas/business.schema';
import { EncryptionUtil } from '../utils/encryption.util';

const SHOP = 'demo-store.myshopify.com';

/** A Business stand-in that records what a save would have persisted. */
const businessDoc = (
  overrides: Record<string, any> = {},
): Record<string, any> => ({
  _id: 'biz-1',
  shopifyShopDomain: SHOP,
  shopifyAccessToken: EncryptionUtil.encrypt('shppa_old'),
  shopifyRefreshToken: EncryptionUtil.encrypt('refresh_old'),
  shopifyScopes: ['read_products'],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('ShopifyTokenService', () => {
  let service: ShopifyTokenService;
  let businessModel: any;
  let fetchMock: jest.Mock;

  const minutesFromNow = (minutes: number) =>
    new Date(Date.now() + minutes * 60 * 1000);

  beforeEach(async () => {
    businessModel = { findById: jest.fn() };

    const config: Record<string, string> = {
      SHOPIFY_API_KEY: 'client-id',
      SHOPIFY_API_SECRET: 'client-secret',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyTokenService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
        { provide: getModelToken(Business.name), useValue: businessModel },
      ],
    }).compile();

    service = module.get<ShopifyTokenService>(ShopifyTokenService);

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => jest.restoreAllMocks());

  const refreshResponse = (body: Record<string, unknown>) => ({
    ok: true,
    status: 200,
    json: async () => body,
  });

  it('returns the stored token untouched while it is still fresh', async () => {
    const business = businessDoc({ shopifyTokenExpiresAt: minutesFromNow(45) });

    await expect(service.getValidAccessTokenFor(business as any)).resolves.toBe(
      'shppa_old',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes a token that expires inside the skew window', async () => {
    const business = businessDoc({ shopifyTokenExpiresAt: minutesFromNow(2) });
    fetchMock.mockResolvedValue(
      refreshResponse({
        access_token: 'shppa_new',
        expires_in: 3600,
        refresh_token: 'refresh_new',
        refresh_token_expires_in: 7776000,
        scope: 'read_products,write_products',
      }),
    );

    await expect(service.getValidAccessTokenFor(business as any)).resolves.toBe(
      'shppa_new',
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://${SHOP}/admin/oauth/access_token`);
    expect(JSON.parse(init.body)).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'refresh_old',
      client_id: 'client-id',
      client_secret: 'client-secret',
    });
  });

  it('persists the rotated refresh token, not just the access token', async () => {
    const business = businessDoc({ shopifyTokenExpiresAt: minutesFromNow(2) });
    fetchMock.mockResolvedValue(
      refreshResponse({
        access_token: 'shppa_new',
        expires_in: 3600,
        refresh_token: 'refresh_new',
        refresh_token_expires_in: 7776000,
      }),
    );

    await service.getValidAccessTokenFor(business as any);

    expect(business.save).toHaveBeenCalled();
    expect(EncryptionUtil.decrypt(business.shopifyRefreshToken)).toBe(
      'refresh_new',
    );
    expect(EncryptionUtil.decrypt(business.shopifyAccessToken)).toBe(
      'shppa_new',
    );
    expect(business.shopifyTokenExpiresAt.getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it('leaves a legacy non-expiring token alone', async () => {
    const business = businessDoc({
      shopifyAccessToken: EncryptionUtil.encrypt('shpua_legacy'),
      shopifyRefreshToken: undefined,
      shopifyTokenExpiresAt: undefined,
    });

    await expect(service.getValidAccessTokenFor(business as any)).resolves.toBe(
      'shpua_legacy',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns nothing once the refresh token itself has expired', async () => {
    const business = businessDoc({
      shopifyTokenExpiresAt: minutesFromNow(-5),
      shopifyRefreshTokenExpiresAt: minutesFromNow(-1),
    });

    await expect(
      service.getValidAccessTokenFor(business as any),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns nothing when a refresh fails and the stored token is already dead', async () => {
    const business = businessDoc({ shopifyTokenExpiresAt: minutesFromNow(-5) });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: 'invalid_request',
          error_description: 'This request requires an active refresh_token',
        }),
    });

    await expect(
      service.getValidAccessTokenFor(business as any),
    ).resolves.toBeUndefined();
  });

  it('keeps serving a token that has not expired yet when the refresh fails', async () => {
    const business = businessDoc({ shopifyTokenExpiresAt: minutesFromNow(2) });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'upstream error',
    });

    await expect(service.getValidAccessTokenFor(business as any)).resolves.toBe(
      'shppa_old',
    );
  });

  it('never lets a refresh error body reach the thrown message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: 'invalid_request',
          client_secret: 'super-secret',
          refresh_token: 'refresh_old',
        }),
    });

    await expect(service.refresh(SHOP, 'refresh_old')).rejects.toThrow(
      /HTTP 400/,
    );
    await expect(service.refresh(SHOP, 'refresh_old')).rejects.not.toThrow(
      /super-secret/,
    );
  });

  it('looks the tenant up by id and selects the refresh token', async () => {
    const business = businessDoc({ shopifyTokenExpiresAt: minutesFromNow(45) });
    const select = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(business),
    });
    businessModel.findById.mockReturnValue({ select });

    await expect(service.getValidAccessToken('biz-1')).resolves.toBe(
      'shppa_old',
    );
    expect(select).toHaveBeenCalledWith(
      '+shopifyAccessToken +shopifyRefreshToken',
    );
  });
});
