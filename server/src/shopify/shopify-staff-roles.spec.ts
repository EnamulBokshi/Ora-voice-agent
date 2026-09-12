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
import { AdminRole } from '../users/enums/admin-role.enum';
import { SHOPIFY_SYNC_QUEUE } from './shopify.constants';
import { shopifyTokenServiceProvider } from '../common/shopify-token/shopify-token.testing';
import { BusinessCredentialsUtil } from '../common/utils/business-credentials.util';
import { ShopifySessionTokenClaims } from './shopify.types';

const SHOP = 'demo-store.myshopify.com';
const KEY = 'biz_live_0123456789abcdef01234567';

const claimsFor = (sub: string): ShopifySessionTokenClaims =>
  ({
    dest: `https://${SHOP}`,
    iss: `https://${SHOP}/admin`,
    aud: 'client-id',
    sub,
    exp: 0,
    nbf: 0,
    iat: 0,
    jti: 'jti',
    sid: 'sid',
  }) as ShopifySessionTokenClaims;

/**
 * An embedded session used to belong to a store rather than to a person: every
 * staff member Shopify let into the app was handed the tenant's oldest
 * account, which is always the OWNER. These tests pin who gets which role.
 */
describe('ShopifyService staff role mapping', () => {
  let service: ShopifyService;
  let usersService: { findByEmail: jest.Mock; createAdminUser: jest.Mock };
  let adminUserModel: { findOne: jest.Mock };
  let businessModel: { findOne: jest.Mock };
  let authService: { issueSessionForUser: jest.Mock };

  const chain = (result: unknown) => {
    const exec = jest.fn().mockResolvedValue(result);
    return {
      exec,
      sort: jest.fn().mockReturnValue({ exec }),
      select: jest.fn().mockReturnValue({ exec }),
    };
  };

  const business = () =>
    ({
      _id: { toString: () => 'biz-1' },
      name: 'Demo Store',
      publishableKey: KEY,
      shopifyShopDomain: SHOP,
      shopifyStorefrontKeySyncedValue: KEY,
      shopifyScopes: ['read_products', 'write_products'],
      shopifyAccessToken: BusinessCredentialsUtil.protect('shppa_token'),
      shopifyRefreshToken: BusinessCredentialsUtil.protect('refresh_1'),
    }) as any;

  const staffPayload = (overrides: Record<string, unknown> = {}) => ({
    id: 7001,
    first_name: 'Sam',
    last_name: 'Staffer',
    email: 'sam@demo.test',
    email_verified: true,
    account_owner: false,
    collaborator: false,
    ...overrides,
  });

  /** Answers the online token exchange that identifies the staff member. */
  const mockIdentify = (overrides: Record<string, unknown> = {}) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ associated_user: staffPayload(overrides) }),
    }) as unknown as typeof fetch;
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      createAdminUser: jest
        .fn()
        .mockImplementation(async (params) => ({ _id: 'user-new', ...params })),
    };
    adminUserModel = { findOne: jest.fn().mockReturnValue(chain(null)) };
    businessModel = { findOne: jest.fn().mockReturnValue(chain(business())) };
    authService = {
      issueSessionForUser: jest.fn().mockResolvedValue({
        tokens: { accessToken: 'jwt', refreshToken: 'refresh' },
      }),
    };

    const config: Record<string, string> = {
      SHOPIFY_API_KEY: 'client-id',
      SHOPIFY_API_SECRET: 'client-secret',
      ORA_API_URL: 'https://api.ora.test',
      SHOPIFY_SCOPES: 'read_products,write_products',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyService,
        shopifyTokenServiceProvider(),
        { provide: ConfigService, useValue: { get: (k: string) => config[k] } },
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: RedisService, useValue: {} },
        { provide: getModelToken(Business.name), useValue: businessModel },
        { provide: getModelToken(AdminUser.name), useValue: adminUserModel },
        { provide: getQueueToken(SHOPIFY_SYNC_QUEUE), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<ShopifyService>(ShopifyService);
  });

  afterEach(() => jest.restoreAllMocks());

  const resolve = (sub: string) =>
    (service as any).resolveStaffUser(business(), claimsFor(sub), 'session-token');

  it('gives a non-owner staff member STAFF, not OWNER', async () => {
    mockIdentify({ account_owner: false });

    const user = await resolve('7001');

    // The whole defect in one assertion: this used to come back as the
    // tenant's OWNER, with rights over billing and the secret API key.
    expect(user.role).toBe(AdminRole.STAFF);
    expect(user.shopifyStaffUserId).toBe('7001');
  });

  it('gives the Shopify account owner OWNER', async () => {
    mockIdentify({ account_owner: true, id: 9000 });

    const user = await resolve('9000');

    expect(user.role).toBe(AdminRole.OWNER);
  });

  it('treats an outside collaborator as STAFF', async () => {
    mockIdentify({ collaborator: true, account_owner: false });

    const user = await resolve('7001');

    expect(user.role).toBe(AdminRole.STAFF);
  });

  it('reads a missing account_owner flag as not the owner', async () => {
    mockIdentify({ account_owner: undefined });

    const user = await resolve('7001');

    expect(user.role).toBe(AdminRole.STAFF);
  });

  it('claims the install-time owner record for the account owner', async () => {
    mockIdentify({ account_owner: true, id: 9000 });

    const installOwner = {
      _id: 'owner-1',
      role: AdminRole.OWNER,
      save: jest.fn().mockResolvedValue(undefined),
    };
    adminUserModel.findOne
      .mockReturnValueOnce(chain(null)) // no account carries this staff id yet
      .mockReturnValueOnce(chain(installOwner)); // the unlinked install owner

    const user = await resolve('9000');

    // A second OWNER beside the first would leave the tenant with two.
    expect(user).toBe(installOwner);
    expect(installOwner.shopifyStaffUserId).toBe('9000');
    expect(usersService.createAdminUser).not.toHaveBeenCalled();
  });

  it('does not hand a staff member the unlinked owner record', async () => {
    mockIdentify({ account_owner: false });

    adminUserModel.findOne.mockReturnValue(
      chain({ _id: 'owner-1', role: AdminRole.OWNER, save: jest.fn() }),
    );

    // The first lookup is by staff id and finds nothing in the fixed code; if
    // a future change ever reaches for the owner record on a non-owner, this
    // asserts the role it hands back is still STAFF.
    adminUserModel.findOne.mockReturnValueOnce(chain(null));

    const user = await resolve('7001');

    expect(user.role).toBe(AdminRole.STAFF);
  });

  it('spends no online exchange once the staff member is known', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    adminUserModel.findOne.mockReturnValue(
      chain({ _id: 'user-7001', role: AdminRole.STAFF }),
    );

    const user = await resolve('7001');

    expect(user._id).toBe('user-7001');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('aliases the email when the staff address already has an ORA account', async () => {
    mockIdentify({ account_owner: false });
    usersService.findByEmail.mockResolvedValue({ _id: 'someone-else' });

    await resolve('7001');

    // `AdminUser.email` is globally unique, so reusing it would either fail
    // the write or repoint another tenant's account.
    expect(usersService.createAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: `shopify+7001+${SHOP}@ora.internal`,
      }),
    );
  });

  it('refuses a session token that names no staff member', async () => {
    await expect(resolve('')).rejects.toMatchObject({
      status: 401,
    });
    expect(usersService.createAdminUser).not.toHaveBeenCalled();
  });

  it('fails closed when Shopify will not say who is signed in', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => '{"error":"unavailable"}',
    }) as unknown as typeof fetch;

    // Falling back to the owner account here is precisely the removed bug, so
    // an unidentifiable visitor gets no session at all.
    await expect(resolve('7001')).rejects.toBeDefined();
    expect(usersService.createAdminUser).not.toHaveBeenCalled();
  });

  it('issues the session for the staff member, not for the tenant owner', async () => {
    mockIdentify({ account_owner: false });
    jest.spyOn(service, 'verifySessionToken').mockReturnValue(claimsFor('7001'));

    const result = await service.establishSession('session-token');

    expect(authService.issueSessionForUser).toHaveBeenCalledWith(
      'user-new',
      'biz-1',
      'sam@demo.test',
      AdminRole.STAFF,
      {},
    );
    expect(result.user.role).toBe(AdminRole.STAFF);
  });
});
