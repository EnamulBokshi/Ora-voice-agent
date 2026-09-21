import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BillingService } from './billing.service';
import { Plan } from './schemas/plan.schema';
import { Subscription } from './schemas/subscription.schema';
import { PaymentTransaction } from './schemas/payment-transaction.schema';
import { AdminUser } from '../users/schemas/admin-user.schema';
import { Business } from '../users/schemas/business.schema';
import { OnboardingEmailService } from '../auth/services/onboarding-email.service';
import { StripeProvider } from './providers/stripe.provider';
import { BkashProvider } from './providers/bkash.provider';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../common/redis/redis.service';

import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { EntitlementService } from '../common/entitlement/entitlement.service';
import { TrialLog } from './schemas/trial-log.schema';
import { KnowledgeBase } from '../knowledge/schemas/knowledge-base.schema';

describe('BillingService', () => {
  let service: BillingService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          // The entitlement check is exercised in entitlement.service.spec.ts
          // and subscription.guard.spec.ts; here it stands aside.
          provide: EntitlementService,
          useValue: {
            assertEntitled: jest.fn().mockResolvedValue(undefined),
            decide: jest.fn().mockResolvedValue({ entitled: true }),
            invalidate: jest.fn().mockResolvedValue(undefined),
          },
        },
        BillingService,
        {
          provide: getModelToken(Plan.name),
          useValue: {
            find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
            findOne: jest.fn(),
            countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
            insertMany: jest.fn(),
          },
        },
        {
          provide: getModelToken(Subscription.name),
          useValue: {
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getModelToken(PaymentTransaction.name),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: getModelToken(AdminUser.name),
          useValue: {
            updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) }),
            findOne: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
              exec: jest.fn().mockResolvedValue(null),
            }),
            findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
          },
        },
        {
          provide: getModelToken(Business.name),
          useValue: {
            findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendCongratulationsEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: any) => defaultVal),
          },
        },
        {
          provide: OnboardingEmailService,
          useValue: {
            sendOnboardingEmail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: StripeProvider,
          useValue: {
            createSubscription: jest.fn().mockResolvedValue({ subscriptionId: 'sub_mock_123' }),
          },
        },
        {
          provide: BkashProvider,
          useValue: {},
        },
        {
          provide: InvoicesService,
          useValue: {
            generateInvoice: jest.fn().mockResolvedValue({ invoiceNumber: 'ORA-2026-000100' }),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue('5'),
              incrby: jest.fn().mockResolvedValue(6),
            }),
          },
        },
        {
          provide: getModelToken(TrialLog.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getModelToken(KnowledgeBase.name),
          useValue: {
            countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('plan activation email dispatching', () => {
    it('should dispatch welcome and onboarding guide email when free plan is activated', async () => {
      const planModel = module.get(getModelToken(Plan.name));
      const subModel = module.get(getModelToken(Subscription.name));
      const businessModel = module.get(getModelToken(Business.name));
      const adminUserModel = module.get(getModelToken(AdminUser.name));
      const mailService = module.get(MailService);
      const onboardingService = module.get(OnboardingEmailService);

      planModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          planId: 'free',
          name: 'Free Tier',
          priceUsdCents: 0,
          priceBdtPaisa: 0,
        }),
      });

      subModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'sub_123',
          planId: 'free',
          status: 'active',
        }),
      });

      const mockBusinessObj = {
        _id: 'biz_123',
        name: 'Apex Store',
        publishableKey: 'biz_live_1234567890ab',
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      businessModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBusinessObj),
      });

      const mockUserObj = {
        _id: 'user_123',
        email: 'merchant@apex.com',
        name: 'Apex Merchant',
        role: 'owner',
      };
      adminUserModel.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUserObj) }),
        exec: jest.fn().mockResolvedValue(mockUserObj),
      });

      const result = await service.subscribe('biz_123', {
        planId: 'free' as any,
      });

      expect(result.requiresRedirect).toBe(false);
      expect(mailService.sendCongratulationsEmail).toHaveBeenCalledWith(
        'merchant@apex.com',
        expect.objectContaining({
          recipientName: 'Apex Merchant',
          storeName: 'Apex Store',
          planName: 'Free Tier',
        }),
      );
      expect(onboardingService.sendOnboardingEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'merchant@apex.com',
          merchantName: 'Apex Merchant',
          storeName: 'Apex Store',
          publishableKey: 'biz_live_1234567890ab',
        }),
      );
    });
  });

  describe('activateShopifySubscription with an unknown plan', () => {
    /**
     * The plan is no longer read from the callback's query string, so "plan
     * unknown" is reachable: a dropped Redis record plus an unreachable
     * Shopify. `planId` is required on the schema, so the upsert would fail
     * validation.
     */
    it('refuses to create a subscription when no plan could be matched', async () => {
      const subModel = module.get(getModelToken(Subscription.name));
      subModel.findOne = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      subModel.findOneAndUpdate = jest.fn();
      const businessModel = module.get(getModelToken(Business.name));
      businessModel.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      const result = await service.activateShopifySubscription(
        'biz_123',
        '98765',
        'ACTIVE',
      );

      expect(result).toBeNull();
      expect(subModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(businessModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('updates an existing subscription without changing its plan', async () => {
      const subModel = module.get(getModelToken(Subscription.name));
      subModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'sub_123', planId: 'starter' }),
      });
      subModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'sub_123', planId: 'starter' }),
      });
      const businessModel = module.get(getModelToken(Business.name));
      businessModel.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.activateShopifySubscription('biz_123', '98765', 'ACTIVE');

      const [, update] = subModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.planId).toBeUndefined();
      // The gid form is reduced so the webhook path matches the same document.
      expect(update.$set.providerRef).toBe('98765');
    });

    it('stores the numeric id when handed a gid', async () => {
      const subModel = module.get(getModelToken(Subscription.name));
      subModel.findOne = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      subModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'sub_123' }),
      });
      const businessModel = module.get(getModelToken(Business.name));
      businessModel.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.activateShopifySubscription(
        'biz_123',
        'gid://shopify/AppSubscription/98765',
        'ACTIVE',
        'starter',
      );

      const [, update] = subModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.providerRef).toBe('98765');
      expect(update.$set.planId).toBe('starter');
    });
  });

  describe('activateShopifySubscription billing period', () => {
    const mockModels = (existing: any) => {
      const subModel = module.get(getModelToken(Subscription.name));
      subModel.findOne = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });
      subModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'sub_123' }),
      });
      const businessModel = module.get(getModelToken(Business.name));
      businessModel.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      return subModel;
    };

    it('stores the period end Shopify reported', async () => {
      // Shopify charges on its own cadence and owns the renewal date.
      const subModel = mockModels(null);
      const periodEnd = new Date('2026-10-11T12:00:00Z');

      await service.activateShopifySubscription(
        'biz_123',
        '98765',
        'ACTIVE',
        'starter',
        periodEnd,
      );

      const [, update] = subModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.currentPeriodEnd).toBe(periodEnd);
    });

    it('never writes cancelAtPeriodEnd', async () => {
      // It used to be forced to false on every callback, silently clearing a
      // cancellation the merchant had already requested.
      const subModel = mockModels({ _id: 'sub_123', planId: 'starter' });

      await service.activateShopifySubscription(
        'biz_123',
        '98765',
        'ACTIVE',
        'starter',
        new Date('2026-10-11T12:00:00Z'),
      );

      const [, update] = subModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.cancelAtPeriodEnd).toBeUndefined();
    });

    it('sets the period start only on creation', async () => {
      const subModel = mockModels({ _id: 'sub_123', planId: 'starter' });

      await service.activateShopifySubscription(
        'biz_123',
        '98765',
        'ACTIVE',
        'starter',
        new Date('2026-10-11T12:00:00Z'),
      );

      const [, update] = subModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.currentPeriodStart).toBeUndefined();
      expect(update.$setOnInsert.currentPeriodStart).toBeInstanceOf(Date);
    });

    it('leaves an existing period end alone when Shopify reports none', async () => {
      const subModel = mockModels({ _id: 'sub_123', planId: 'starter' });

      await service.activateShopifySubscription(
        'biz_123',
        '98765',
        'ACTIVE',
        'starter',
      );

      const [, update] = subModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.currentPeriodEnd).toBeUndefined();
    });

    it('estimates a period end only when creating with none reported', async () => {
      // The field is required on the schema, so an insert has to carry one.
      const subModel = mockModels(null);

      await service.activateShopifySubscription(
        'biz_123',
        '98765',
        'ACTIVE',
        'starter',
      );

      const [, update] = subModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.currentPeriodEnd).toBeInstanceOf(Date);
    });
  });

  describe('applyShopifySubscriptionState', () => {
    /**
     * The webhook is the only path that reports a cancellation, a decline, an
     * expiry or a frozen charge. Before it existed, `app_subscriptions/update`
     * reached the ingestion route, matched no catalog topic, and changed
     * nothing — so a merchant who cancelled kept full access.
     */
    const mockSubscriptionFound = () => {
      const subModel = module.get(getModelToken(Subscription.name));
      subModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'sub_123', status: 'canceled' }),
      });
      const businessModel = module.get(getModelToken(Business.name));
      businessModel.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      return { subModel, businessModel };
    };

    it('suspends the business when Shopify reports the charge CANCELLED', async () => {
      const { subModel, businessModel } = mockSubscriptionFound();

      await service.applyShopifySubscriptionState(
        'biz_123',
        'gid://shopify/AppSubscription/98765',
        'CANCELLED',
      );

      expect(subModel.findOneAndUpdate).toHaveBeenCalledWith(
        // The gid is reduced to the numeric id the billing callback stored.
        { businessId: 'biz_123', providerRef: '98765' },
        { $set: { status: 'canceled', billingProvider: 'shopify' } },
        { returnDocument: 'after' },
      );
      expect(businessModel.findByIdAndUpdate).toHaveBeenCalledWith('biz_123', {
        $set: { status: 'suspended' },
      });
    });

    it('suspends without cancelling when the charge is FROZEN', async () => {
      const { subModel, businessModel } = mockSubscriptionFound();

      await service.applyShopifySubscriptionState('biz_123', '98765', 'FROZEN');

      expect(subModel.findOneAndUpdate).toHaveBeenCalledWith(
        { businessId: 'biz_123', providerRef: '98765' },
        { $set: { status: 'suspended', billingProvider: 'shopify' } },
        { returnDocument: 'after' },
      );
      expect(businessModel.findByIdAndUpdate).toHaveBeenCalledWith('biz_123', {
        $set: { status: 'suspended' },
      });
    });

    it('reactivates the business when the charge is ACTIVE', async () => {
      const { businessModel } = mockSubscriptionFound();

      await service.applyShopifySubscriptionState('biz_123', '98765', 'ACTIVE');

      expect(businessModel.findByIdAndUpdate).toHaveBeenCalledWith('biz_123', {
        $set: { status: 'active' },
      });
    });

    it('changes nothing while the charge is still PENDING approval', async () => {
      const { subModel, businessModel } = mockSubscriptionFound();

      const result = await service.applyShopifySubscriptionState(
        'biz_123',
        '98765',
        'PENDING',
      );

      expect(result).toBeNull();
      expect(subModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(businessModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('does not touch the business when no subscription matches the charge', async () => {
      const subModel = module.get(getModelToken(Subscription.name));
      subModel.findOneAndUpdate = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const businessModel = module.get(getModelToken(Business.name));
      businessModel.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      const result = await service.applyShopifySubscriptionState(
        'biz_123',
        '98765',
        'CANCELLED',
      );

      expect(result).toBeNull();
      expect(businessModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('ignores a status Shopify has not documented', async () => {
      const { subModel, businessModel } = mockSubscriptionFound();

      const result = await service.applyShopifySubscriptionState(
        'biz_123',
        '98765',
        'SOMETHING_NEW',
      );

      expect(result).toBeNull();
      expect(subModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(businessModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
