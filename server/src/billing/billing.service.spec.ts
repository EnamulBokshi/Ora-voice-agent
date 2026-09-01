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

describe('BillingService', () => {
  let service: BillingService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
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
});
