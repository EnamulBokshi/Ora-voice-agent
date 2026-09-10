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

const SHOP = 'demo-store.myshopify.com';

/**
 * A provisioned tenant must be immediately usable. `createBusiness` hardcodes
 * `status: 'pending'` and `createAdminUser` hardcodes `emailVerified: false`,
 * so these tests pin the overrides that make a Shopify install work at all.
 */
describe('ShopifyService provisioning', () => {
  let service: ShopifyService;
  let usersService: {
    findByEmail: jest.Mock;
    createBusiness: jest.Mock;
    createAdminUser: jest.Mock;
  };
  let businessModel: { findOne: jest.Mock; findById: jest.Mock };
  let adminUserModel: { findOne: jest.Mock };
  let syncQueue: { add: jest.Mock };

  const shopDetails = {
    id: 1,
    name: 'Demo Store',
    email: 'owner@demo.test',
    shopOwner: 'Demo Owner',
    domain: 'demo.test',
    myshopifyDomain: SHOP,
  };

  /**
   * `resolveOwner` sorts and `ensureOwner` does not, so one mock has to answer
   * both `.exec()` and `.sort().exec()`.
   */
  const chain = (result: unknown) => {
    const exec = jest.fn().mockResolvedValue(result);
    return { exec, sort: jest.fn().mockReturnValue({ exec }) };
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      createBusiness: jest.fn(),
      createAdminUser: jest.fn().mockResolvedValue({
        _id: 'user-1',
        email: shopDetails.email,
        name: shopDetails.shopOwner,
        role: AdminRole.OWNER,
        emailVerified: true,
      }),
    };

    businessModel = {
      findOne: jest.fn().mockReturnValue(chain(null)),
      findById: jest.fn().mockReturnValue(chain(null)),
    };
    adminUserModel = { findOne: jest.fn().mockReturnValue(chain(null)) };
    syncQueue = { add: jest.fn().mockResolvedValue(undefined) };

    const config: Record<string, string> = {
      SHOPIFY_API_KEY: 'client-id',
      SHOPIFY_API_SECRET: 'client-secret',
      SHOPIFY_APP_URL: 'https://app.ora.test',
      SHOPIFY_SCOPES: 'read_products,write_products',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyService,
        { provide: ConfigService, useValue: { get: (key: string) => config[key] } },
        { provide: AuthService, useValue: { issueSessionForUser: jest.fn() } },
        { provide: UsersService, useValue: usersService },
        {
          provide: RedisService,
          useValue: { acquireLock: jest.fn(), releaseLock: jest.fn() },
        },
        { provide: getModelToken(Business.name), useValue: businessModel },
        { provide: getModelToken(AdminUser.name), useValue: adminUserModel },
        { provide: getQueueToken(SHOPIFY_SYNC_QUEUE), useValue: syncQueue },
      ],
    }).compile();

    service = module.get<ShopifyService>(ShopifyService);

    // Both reach Shopify over the network; the provisioning decisions under
    // test are everything that happens around them.
    jest.spyOn(service, 'fetchShopDetails').mockResolvedValue(shopDetails);
    jest.spyOn(service, 'registerWebhooks').mockResolvedValue(undefined);
  });

  it('creates an active tenant on the shopify platform', async () => {
    usersService.createBusiness.mockResolvedValue({ _id: 'biz-1', name: 'Demo Store' });

    await service.provisionTenant(SHOP, 'shpat_token', ['read_products']);

    const [, , overrides] = usersService.createBusiness.mock.calls[0];
    expect(overrides.status).toBe('active');
    expect(overrides.connectedPlatform).toBe('shopify');
    expect(overrides.shopifyShopDomain).toBe(SHOP);
    expect(overrides.shopifyOwnerEmail).toBe(shopDetails.email);
    expect(overrides.shopifyInstalledAt).toBeInstanceOf(Date);
  });

  it('encrypts the access token rather than storing it in the clear', async () => {
    usersService.createBusiness.mockResolvedValue({ _id: 'biz-1', name: 'Demo Store' });

    await service.provisionTenant(SHOP, 'shpat_plaintext_token', []);

    const [, , overrides] = usersService.createBusiness.mock.calls[0];
    expect(overrides.shopifyAccessToken).not.toBe('shpat_plaintext_token');
    expect(overrides.shopifyAccessToken).toMatch(
      /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/,
    );
  });

  it('makes the owner an OWNER with a verified email', async () => {
    usersService.createBusiness.mockResolvedValue({ _id: 'biz-1', name: 'Demo Store' });

    await service.provisionTenant(SHOP, 'shpat_token', []);

    const params = usersService.createAdminUser.mock.calls[0][0];
    expect(params.role).toBe(AdminRole.OWNER);
    expect(params.emailVerified).toBe(true);
    expect(params.email).toBe(shopDetails.email);
    expect(params.passwordHash).toBeTruthy();
  });

  it('queues the catalog import once, keyed by shop', async () => {
    usersService.createBusiness.mockResolvedValue({ _id: 'biz-1', name: 'Demo Store' });

    await service.provisionTenant(SHOP, 'shpat_token', []);

    expect(syncQueue.add).toHaveBeenCalledTimes(1);
    const [, data, options] = syncQueue.add.mock.calls[0];
    expect(data).toEqual({ businessId: 'biz-1', shopDomain: SHOP });
    // A reinstall must replace a pending job, not queue a second full walk.
    expect(options.jobId).toBe(`initial-sync:${SHOP}`);
  });

  describe('account linking', () => {
    it('links a business that has no catalog source of its own', async () => {
      const existingBusiness = {
        _id: 'biz-existing',
        name: 'Web Signup',
        shopifyShopDomain: undefined,
        connectedPlatform: 'none',
        save: jest.fn().mockResolvedValue(undefined),
      };

      usersService.findByEmail.mockResolvedValue({
        _id: 'user-existing',
        businessId: 'biz-existing',
      });
      businessModel.findById.mockReturnValue(chain(existingBusiness));
      adminUserModel.findOne.mockReturnValue(chain({ _id: 'user-existing' }));

      await service.provisionTenant(SHOP, 'shpat_token', []);

      expect(existingBusiness.save).toHaveBeenCalled();
      expect(existingBusiness.connectedPlatform).toBe('shopify');
      expect(existingBusiness.shopifyShopDomain).toBe(SHOP);
      expect(usersService.createBusiness).not.toHaveBeenCalled();
    });

    it('does not relink a business already connected to WooCommerce', async () => {
      // Repointing would silently switch which catalog the voice agent answers
      // from, so this case gets its own tenant instead.
      const existingBusiness = {
        _id: 'biz-woo',
        name: 'Woo Store',
        shopifyShopDomain: undefined,
        connectedPlatform: 'woocommerce',
        save: jest.fn(),
      };

      usersService.findByEmail.mockResolvedValue({
        _id: 'user-existing',
        businessId: 'biz-woo',
      });
      businessModel.findById.mockReturnValue(chain(existingBusiness));
      usersService.createBusiness.mockResolvedValue({ _id: 'biz-new', name: 'Demo Store' });

      await service.provisionTenant(SHOP, 'shpat_token', []);

      expect(existingBusiness.save).not.toHaveBeenCalled();
      expect(usersService.createBusiness).toHaveBeenCalled();
    });

    it('does not relink a business already bound to another shop', async () => {
      const existingBusiness = {
        _id: 'biz-other-shop',
        name: 'Other Shop',
        shopifyShopDomain: 'other-store.myshopify.com',
        connectedPlatform: 'shopify',
        save: jest.fn(),
      };

      usersService.findByEmail.mockResolvedValue({
        _id: 'user-existing',
        businessId: 'biz-other-shop',
      });
      businessModel.findById.mockReturnValue(chain(existingBusiness));
      usersService.createBusiness.mockResolvedValue({ _id: 'biz-new', name: 'Demo Store' });

      await service.provisionTenant(SHOP, 'shpat_token', []);

      expect(existingBusiness.save).not.toHaveBeenCalled();
      expect(usersService.createBusiness).toHaveBeenCalled();
    });

    it('uses a store-scoped alias when the shop email is already taken', async () => {
      const existingBusiness = {
        _id: 'biz-taken',
        name: 'Taken',
        shopifyShopDomain: 'other-store.myshopify.com',
        connectedPlatform: 'shopify',
        save: jest.fn(),
      };

      usersService.findByEmail.mockResolvedValue({
        _id: 'user-existing',
        businessId: 'biz-taken',
      });
      businessModel.findById.mockReturnValue(chain(existingBusiness));
      usersService.createBusiness.mockResolvedValue({ _id: 'biz-new', name: 'Demo Store' });

      await service.provisionTenant(SHOP, 'shpat_token', []);

      const params = usersService.createAdminUser.mock.calls[0][0];
      // A duplicate email would be an E11000; the alias avoids it without
      // repointing the account that already owns the address.
      expect(params.email).toBe(`shopify+${SHOP}@ora.internal`);

      // The real address still has to reach the merchant for invoices.
      const [, , overrides] = usersService.createBusiness.mock.calls[0];
      expect(overrides.shopifyOwnerEmail).toBe(shopDetails.email);
    });

    it('reuses an existing owner rather than creating a second one', async () => {
      usersService.createBusiness.mockResolvedValue({ _id: 'biz-1', name: 'Demo Store' });
      adminUserModel.findOne.mockReturnValue(chain({ _id: 'owner-existing' }));

      await service.provisionTenant(SHOP, 'shpat_token', []);

      expect(usersService.createAdminUser).not.toHaveBeenCalled();
    });
  });

  describe('resolveOwner', () => {
    it('rebuilds an owner for a tenant that somehow has none', async () => {
      // A Business with no AdminUser cannot hold a session, so handing back a
      // token would produce one nothing can be scoped to.
      adminUserModel.findOne.mockReturnValue(chain(null));

      const business = {
        _id: 'biz-orphan',
        name: 'Orphan Store',
        shopifyShopDomain: SHOP,
        shopifyOwnerEmail: 'owner@demo.test',
      } as any;

      const owner = await (service as any).resolveOwner(business);

      expect(usersService.createAdminUser).toHaveBeenCalled();
      expect(owner.role).toBe(AdminRole.OWNER);
    });
  });
});
