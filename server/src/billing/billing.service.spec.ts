import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BillingService } from './billing.service';
import { Plan } from './schemas/plan.schema';
import { Subscription } from './schemas/subscription.schema';
import { PaymentTransaction } from './schemas/payment-transaction.schema';
import { StripeProvider } from './providers/stripe.provider';
import { BkashProvider } from './providers/bkash.provider';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../common/redis/redis.service';

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
});
