import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpStatus } from '@nestjs/common';

import { EntitlementService } from './entitlement.service';
import { Business } from '../../users/schemas/business.schema';
import { Subscription } from '../../billing/schemas/subscription.schema';
import { RedisService } from '../redis/redis.service';
import { DomainException } from '../exceptions/domain.exception';

/**
 * The plan gate used to exist only in the embedded UI. A Shopify merchant who
 * never approved a charge still held a valid ORA session — `POST
 * /shopify/session` issues one at install — so the API answered them anyway.
 */
describe('EntitlementService', () => {
  const BUSINESS_ID = '671234567890123456789012';

  let service: EntitlementService;
  let businessModel: { findById: jest.Mock };
  let subscriptionModel: { findOne: jest.Mock };
  let redisClient: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockBusiness = (doc: any) => {
    businessModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
      }),
    });
  };

  const mockSubscription = (doc: any) => {
    subscriptionModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
      }),
    });
  };

  beforeEach(async () => {
    businessModel = { findById: jest.fn() };
    subscriptionModel = { findOne: jest.fn() };
    redisClient = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementService,
        { provide: getModelToken(Business.name), useValue: businessModel },
        {
          provide: getModelToken(Subscription.name),
          useValue: subscriptionModel,
        },
        { provide: RedisService, useValue: { getClient: () => redisClient } },
      ],
    }).compile();

    service = module.get<EntitlementService>(EntitlementService);
  });

  describe('Shopify tenants', () => {
    it('denies an installed store that has no subscription', async () => {
      mockBusiness({ status: 'active', shopifyShopDomain: 'demo.myshopify.com' });
      mockSubscription(null);

      const decision = await service.decide(BUSINESS_ID);

      expect(decision.entitled).toBe(false);
      expect(decision.code).toBe('SUBSCRIPTION_REQUIRED');
    });

    it('allows an active subscription', async () => {
      mockBusiness({ status: 'active', shopifyShopDomain: 'demo.myshopify.com' });
      mockSubscription({ status: 'active' });

      await expect(service.decide(BUSINESS_ID)).resolves.toEqual({
        entitled: true,
      });
    });

    it('allows a trialing subscription that is within trial window', async () => {
      const futureDate = new Date(Date.now() + 7 * 86400000);
      mockBusiness({ status: 'active', shopifyShopDomain: 'demo.myshopify.com' });
      mockSubscription({ status: 'trialing', currentPeriodEnd: futureDate });

      await expect(service.decide(BUSINESS_ID)).resolves.toEqual({
        entitled: true,
      });
    });

    it('denies an expired trialing subscription', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      mockBusiness({ status: 'active', shopifyShopDomain: 'demo.myshopify.com' });
      mockSubscription({ status: 'trialing', currentPeriodEnd: pastDate });

      const decision = await service.decide(BUSINESS_ID);
      expect(decision.entitled).toBe(false);
      expect(decision.code).toBe('TRIAL_EXPIRED');
    });

    it.each(['canceled', 'suspended', 'past_due'])(
      'denies a %s subscription',
      async (status) => {
        mockBusiness({
          status: 'active',
          shopifyShopDomain: 'demo.myshopify.com',
        });
        mockSubscription({ status });

        const decision = await service.decide(BUSINESS_ID);

        expect(decision.entitled).toBe(false);
        expect(decision.code).toBe('SUBSCRIPTION_REQUIRED');
      },
    );

    it('denies a suspended store before it reads the subscription', async () => {
      // `app/uninstalled` suspends the tenant, so an uninstalled store stops
      // here whatever its subscription still says.
      mockBusiness({
        status: 'suspended',
        shopifyShopDomain: 'demo.myshopify.com',
      });

      const decision = await service.decide(BUSINESS_ID);

      expect(decision.entitled).toBe(false);
      expect(decision.code).toBe('TENANT_SUSPENDED');
      expect(subscriptionModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('universal evaluation across all tenants', () => {
    it('requires subscription for non-Shopify tenant with no subscription', async () => {
      mockBusiness({ status: 'active', shopifyShopDomain: null });
      mockSubscription(null);

      const decision = await service.decide(BUSINESS_ID);
      expect(decision.entitled).toBe(false);
      expect(decision.code).toBe('SUBSCRIPTION_REQUIRED');
    });

    it('allows non-Shopify tenant with active subscription', async () => {
      mockBusiness({ status: 'active', shopifyShopDomain: null });
      mockSubscription({ status: 'active' });

      await expect(service.decide(BUSINESS_ID)).resolves.toEqual({
        entitled: true,
      });
    });
  });

  describe('assertEntitled', () => {
    it('throws 402 so the client can tell "buy a plan" from "forbidden"', async () => {
      mockBusiness({ status: 'active', shopifyShopDomain: 'demo.myshopify.com' });
      mockSubscription(null);

      await expect(service.assertEntitled(BUSINESS_ID)).rejects.toMatchObject({
        status: HttpStatus.PAYMENT_REQUIRED,
      });
      await expect(
        service.assertEntitled(BUSINESS_ID),
      ).rejects.toBeInstanceOf(DomainException);
    });

    it('returns quietly when the tenant is entitled', async () => {
      mockBusiness({ status: 'active', shopifyShopDomain: 'demo.myshopify.com' });
      mockSubscription({ status: 'active' });

      await expect(
        service.assertEntitled(BUSINESS_ID),
      ).resolves.toBeUndefined();
    });
  });

  describe('caching', () => {
    it('serves a cached decision without touching the database', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify({ entitled: true }));

      await expect(service.decide(BUSINESS_ID)).resolves.toEqual({
        entitled: true,
      });
      expect(businessModel.findById).not.toHaveBeenCalled();
    });

    it('caches the decision it just made', async () => {
      mockBusiness({ status: 'active', shopifyShopDomain: 'demo.myshopify.com' });
      mockSubscription({ status: 'active' });

      await service.decide(BUSINESS_ID);

      expect(redisClient.set).toHaveBeenCalledWith(
        `entitlement:${BUSINESS_ID}`,
        JSON.stringify({ entitled: true }),
        'EX',
        60,
      );
    });

    it('falls through to the database when Redis is unreachable', async () => {
      redisClient.get.mockRejectedValue(new Error('redis down'));
      mockBusiness({ status: 'active', shopifyShopDomain: 'demo.myshopify.com' });
      mockSubscription({ status: 'active' });

      await expect(service.decide(BUSINESS_ID)).resolves.toEqual({
        entitled: true,
      });
    });

    it('drops the cached decision on invalidate', async () => {
      await service.invalidate(BUSINESS_ID);

      expect(redisClient.del).toHaveBeenCalledWith(
        `entitlement:${BUSINESS_ID}`,
      );
    });
  });

  it('stands aside for a business that does not exist', async () => {
    // A missing tenant is an authentication problem, reported elsewhere.
    mockBusiness(null);

    await expect(service.decide(BUSINESS_ID)).resolves.toEqual({
      entitled: true,
    });
  });
});
