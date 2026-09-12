import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';

import { ShopifyProvider } from './shopify.provider';
import { Plan } from '../schemas/plan.schema';
import { Business } from '../../users/schemas/business.schema';
import { RedisService } from '../../common/redis/redis.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { SHOPIFY_PENDING_CHARGE_PREFIX } from '../../shopify/shopify.constants';
import { shopifyTokenServiceProvider } from '../../common/shopify-token/shopify-token.testing';

/**
 * The billing callback is unauthenticated and Shopify does not sign its query
 * string. Everything here exists because the plan that callback activates must
 * therefore come from server-side state, not from the URL.
 */
describe('ShopifyProvider — billing callback trust boundary', () => {
  const BUSINESS_ID = '671234567890123456789012';
  const OTHER_BUSINESS_ID = '671234567890123456789099';
  const CHARGE_GID = 'gid://shopify/AppSubscription/98765';

  let provider: ShopifyProvider;
  let redisClient: { get: jest.Mock; set: jest.Mock };
  let planModel: { findOne: jest.Mock };
  let businessModel: { findById: jest.Mock };
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    redisClient = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    planModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          planId: 'starter',
          name: 'Starter',
          priceUsdCents: 4900,
          billingInterval: 'month',
          trialDays: 14,
        }),
      }),
    };

    businessModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            shopifyShopDomain: 'demo-store.myshopify.com',
            // Plaintext is accepted by BusinessCredentialsUtil.reveal for a
            // value that was never encrypted.
            shopifyAccessToken: 'shpat_test_token',
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifyProvider,
        shopifyTokenServiceProvider(),
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'ORA_API_URL' ? 'https://tryora.live' : undefined,
            ),
          },
        },
        { provide: getModelToken(Plan.name), useValue: planModel },
        { provide: getModelToken(Business.name), useValue: businessModel },
        {
          provide: RedisService,
          useValue: { getClient: () => redisClient },
        },
      ],
    }).compile();

    provider = module.get<ShopifyProvider>(ShopifyProvider);

    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          appSubscriptionCreate: {
            appSubscription: { id: CHARGE_GID, status: 'PENDING' },
            confirmationUrl: 'https://admin.shopify.com/charges/98765/confirm',
            userErrors: [],
          },
        },
      }),
    } as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('createAppSubscription', () => {
    it('keeps the plan out of the return URL and records it server-side', async () => {
      const result = await provider.createAppSubscription(
        BUSINESS_ID,
        'starter',
      );

      expect(result.confirmationUrl).toBe(
        'https://admin.shopify.com/charges/98765/confirm',
      );

      const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
      // `shop` is added so the callback can resolve a tenant when Shopify
      // returns without one; it is not trusted for anything but the lookup,
      // and the plan is never read from this URL.
      expect(sentBody.variables.returnUrl).toBe(
        'https://tryora.live/api/v1/shopify/billing/callback?shop=demo-store.myshopify.com',
      );
      // The old form carried ?plan_id=, which the callback then trusted.
      expect(sentBody.variables.returnUrl).not.toContain('plan_id');

      // Keyed by the numeric id, because that is what `charge_id` will be.
      expect(redisClient.set).toHaveBeenCalledWith(
        `${SHOPIFY_PENDING_CHARGE_PREFIX}98765`,
        JSON.stringify({ businessId: BUSINESS_ID, planId: 'starter' }),
        'EX',
        7 * 24 * 60 * 60,
      );
    });

    it('passes the plan\'s trial length to Shopify', async () => {
      // Shopify owns the trial. Without trialDays in the mutation the merchant
      // is charged on approval, however loudly the plan picker advertises a
      // free trial — which is exactly what shipped before this.
      await provider.createAppSubscription(BUSINESS_ID, 'starter');

      const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
      expect(sentBody.variables.trialDays).toBe(14);
      expect(sentBody.query).toContain('trialDays: $trialDays');
    });

    it('sends no trial for a plan that has none', async () => {
      planModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          planId: 'starter',
          name: 'Starter',
          priceUsdCents: 4900,
          billingInterval: 'month',
        }),
      });

      await provider.createAppSubscription(BUSINESS_ID, 'starter');

      const sentBody = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
      expect(sentBody.variables.trialDays).toBe(0);
    });

    it('rejects a return URL that is not on the API origin', async () => {
      await expect(
        provider.createAppSubscription(
          BUSINESS_ID,
          'starter',
          'https://attacker.example/collect',
        ),
      ).rejects.toBeInstanceOf(DomainException);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('accepts a return URL on the API origin', async () => {
      await expect(
        provider.createAppSubscription(
          BUSINESS_ID,
          'starter',
          'https://tryora.live/api/v1/shopify/billing/callback?ref=retry',
        ),
      ).resolves.toBeDefined();
    });

    it('still returns the confirmation URL when the plan could not be recorded', async () => {
      redisClient.set.mockRejectedValue(new Error('redis down'));

      const result = await provider.createAppSubscription(
        BUSINESS_ID,
        'starter',
      );

      // The merchant is already on their way to Shopify's approval screen.
      expect(result.confirmationUrl).toBeTruthy();
    });
  });

  describe('fetchSubscription', () => {
    /**
     * Status, name and period end come back in one read because the billing
     * callback needs all three. Shopify owns the renewal date, so it is read
     * rather than computed.
     */
    it('returns the status, name and period end Shopify reports', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            node: {
              id: CHARGE_GID,
              status: 'ACTIVE',
              name: 'Starter',
              currentPeriodEnd: '2026-10-11T12:00:00Z',
            },
          },
        }),
      } as any);

      const result = await provider.fetchSubscription(BUSINESS_ID, CHARGE_GID);

      expect(result).toEqual({
        status: 'ACTIVE',
        name: 'Starter',
        currentPeriodEnd: new Date('2026-10-11T12:00:00Z'),
      });
    });

    it('drops an unreadable period end rather than storing an Invalid Date', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            node: {
              id: CHARGE_GID,
              status: 'ACTIVE',
              name: 'Starter',
              currentPeriodEnd: 'not-a-date',
            },
          },
        }),
      } as any);

      const result = await provider.fetchSubscription(BUSINESS_ID, CHARGE_GID);

      expect(result?.status).toBe('ACTIVE');
      expect(result?.currentPeriodEnd).toBeUndefined();
    });

    it('returns null when Shopify reports no subscription', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { node: null } }),
      } as any);

      await expect(
        provider.fetchSubscription(BUSINESS_ID, CHARGE_GID),
      ).resolves.toBeNull();
    });
  });

  describe('resolvePlanFromSubscriptionName', () => {
    /**
     * The fallback for a lost Redis record. Shopify holds the subscription
     * under the plan name `createAppSubscription` gave it, so this answer
     * cannot be influenced by whoever called the callback.
     */
    it('maps the name Shopify reports back to an ORA plan', async () => {
      await expect(
        provider.resolvePlanFromSubscriptionName('Starter'),
      ).resolves.toBe('starter');
      expect(planModel.findOne).toHaveBeenCalledWith({ name: 'Starter' });
    });

    it('returns null when the reported name matches no ORA plan', async () => {
      planModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        provider.resolvePlanFromSubscriptionName('Legacy Tier'),
      ).resolves.toBeNull();
    });

    it('returns null when Shopify reported no name at all', async () => {
      await expect(
        provider.resolvePlanFromSubscriptionName(null),
      ).resolves.toBeNull();
      expect(planModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('resolvePendingChargePlan', () => {
    it('returns the recorded plan for the business that created the charge', async () => {
      redisClient.get.mockResolvedValue(
        JSON.stringify({ businessId: BUSINESS_ID, planId: 'starter' }),
      );

      await expect(
        provider.resolvePendingChargePlan('98765', BUSINESS_ID),
      ).resolves.toBe('starter');
    });

    it('accepts a gid as well as a numeric charge id', async () => {
      redisClient.get.mockResolvedValue(
        JSON.stringify({ businessId: BUSINESS_ID, planId: 'scale' }),
      );

      await expect(
        provider.resolvePendingChargePlan(CHARGE_GID, BUSINESS_ID),
      ).resolves.toBe('scale');
      expect(redisClient.get).toHaveBeenCalledWith(
        `${SHOPIFY_PENDING_CHARGE_PREFIX}98765`,
      );
    });

    it('refuses a charge recorded for a different business', async () => {
      // The callback resolves its business from an unsigned `shop` parameter,
      // so this is the case where a caller names a victim's shop alongside a
      // charge of their own.
      redisClient.get.mockResolvedValue(
        JSON.stringify({ businessId: OTHER_BUSINESS_ID, planId: 'scale' }),
      );

      await expect(
        provider.resolvePendingChargePlan('98765', BUSINESS_ID),
      ).resolves.toBeNull();
    });

    it('returns null for an unknown or expired charge', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(
        provider.resolvePendingChargePlan('98765', BUSINESS_ID),
      ).resolves.toBeNull();
    });

    it('returns null when the record is not readable JSON', async () => {
      redisClient.get.mockResolvedValue('{not json');

      await expect(
        provider.resolvePendingChargePlan('98765', BUSINESS_ID),
      ).resolves.toBeNull();
    });

    it('returns null when Redis is unreachable', async () => {
      redisClient.get.mockRejectedValue(new Error('redis down'));

      await expect(
        provider.resolvePendingChargePlan('98765', BUSINESS_ID),
      ).resolves.toBeNull();
    });
  });
});
