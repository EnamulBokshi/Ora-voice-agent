import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BillingManagementService } from './billing-management.service';
import { Plan } from '../schemas/plan.schema';
import {
  Subscription,
  SubscriptionStatus,
  BillingProvider,
} from '../schemas/subscription.schema';
import { PaymentTransaction } from '../schemas/payment-transaction.schema';
import { Business } from '../../users/schemas/business.schema';
import { AdminUser } from '../../users/schemas/admin-user.schema';
import { Invoice } from '../../invoices/schemas/invoice.schema';
import { CouponService } from './coupon.service';
import { RedisService } from '../../common/redis/redis.service';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('BillingManagementService', () => {
  let service: BillingManagementService;
  let mockPlanModel: any;
  let mockSubscriptionModel: any;
  let mockTransactionModel: any;
  let mockBusinessModel: any;
  let mockAdminUserModel: any;
  let mockInvoiceModel: any;
  let mockCouponService: any;
  let mockRedisService: any;

  beforeEach(async () => {
    mockPlanModel = function (dto: any) {
      return {
        ...dto,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          ...dto,
        }),
      };
    };
    mockPlanModel.find = jest.fn();
    mockPlanModel.findOne = jest.fn();
    mockPlanModel.findByIdAndUpdate = jest.fn();
    mockPlanModel.findByIdAndDelete = jest.fn();

    mockSubscriptionModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    mockTransactionModel = {
      find: jest.fn(),
    };

    mockBusinessModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    mockAdminUserModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockInvoiceModel = {
      find: jest.fn(),
    };

    mockCouponService = {
      telemetryAdmin: jest.fn().mockResolvedValue({
        totalCoupons: 5,
        activeCoupons: 3,
        totalRedemptions: 12,
        totalDiscountVolumeUsd: 240,
        totalDiscountVolumeBdt: 12000,
      }),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue('150'),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingManagementService,
        { provide: getModelToken(Plan.name), useValue: mockPlanModel },
        { provide: getModelToken(Subscription.name), useValue: mockSubscriptionModel },
        { provide: getModelToken(PaymentTransaction.name), useValue: mockTransactionModel },
        { provide: getModelToken(Business.name), useValue: mockBusinessModel },
        { provide: getModelToken(AdminUser.name), useValue: mockAdminUserModel },
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
        { provide: CouponService, useValue: mockCouponService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<BillingManagementService>(BillingManagementService);
  });

  describe('Plan Management', () => {
    it('should retrieve all plans', async () => {
      mockPlanModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([{ planId: 'growth', name: 'Growth Plan' }]),
        }),
      });

      const plans = await service.getAllPlans(true);
      expect(plans).toHaveLength(1);
      expect(plans[0].planId).toBe('growth');
    });

    it('should create a plan with lowercased planId', async () => {
      mockPlanModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const plan = await service.createPlan({
        planId: 'ENTERPRISE',
        name: 'Enterprise Plan',
        priceUsdCents: 49900,
        priceBdtPaisa: 5500000,
        limits: {
          conversationMinutes: 10000,
          ordersPerMonth: 5000,
          connectedStores: 10,
          seats: 20,
        },
        features: ['Dedicated Account Manager'],
      });

      expect(plan.planId).toBe('enterprise');
    });

    it('should throw when creating duplicate planId', async () => {
      mockPlanModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ planId: 'growth' }),
      });

      await expect(
        service.createPlan({
          planId: 'growth',
          name: 'Growth Duplicate',
          priceUsdCents: 4900,
          priceBdtPaisa: 550000,
          limits: {
            conversationMinutes: 1000,
            ordersPerMonth: 500,
            connectedStores: 3,
            seats: 5,
          },
          features: [],
        }),
      ).rejects.toThrow(/already exists/);
    });

    it('should deactivate plan instead of deleting if active subscriptions exist', async () => {
      const planId = new Types.ObjectId();
      const planDoc = {
        _id: planId,
        planId: 'growth',
        name: 'Growth Plan',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      mockPlanModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(planDoc),
      });

      mockSubscriptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5), // 5 active subscriptions
      });

      const res = await service.deletePlan('growth');
      expect(res.deleted).toBe(false);
      expect(res.deactivated).toBe(true);
      expect(planDoc.isActive).toBe(false);
      expect(planDoc.save).toHaveBeenCalled();
    });

    it('should permanently delete plan if zero active subscriptions', async () => {
      const planId = new Types.ObjectId();
      const planDoc = {
        _id: planId,
        planId: 'unused_tier',
        name: 'Unused Plan',
      };

      mockPlanModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(planDoc),
      });

      mockSubscriptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      mockPlanModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      });

      const res = await service.deletePlan('unused_tier');
      expect(res.deleted).toBe(true);
      expect(res.deactivated).toBe(false);
      expect(mockPlanModel.findByIdAndDelete).toHaveBeenCalledWith(planId);
    });
  });

  describe('Subscriptions Management (Pagination & Filtering)', () => {
    it('should return paginated subscriptions with resolved businesses and plans', async () => {
      const businessId = new Types.ObjectId();
      const subId = new Types.ObjectId();

      mockSubscriptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      mockSubscriptionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([
                  {
                    _id: subId,
                    businessId,
                    planId: 'growth',
                    billingProvider: BillingProvider.STRIPE,
                    status: SubscriptionStatus.ACTIVE,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    cancelAtPeriodEnd: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          }),
        }),
      });

      mockBusinessModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                _id: businessId,
                name: 'Merchant Store',
                domain: 'merchant.com',
                status: 'active',
              },
            ]),
          }),
        }),
      });

      mockPlanModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                planId: 'growth',
                name: 'Growth Plan',
                priceUsdCents: 4900,
                priceBdtPaisa: 550000,
                billingInterval: 'month',
              },
            ]),
          }),
        }),
      });

      mockAdminUserModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                businessId,
                email: 'owner@merchant.com',
                name: 'Store Owner',
              },
            ]),
          }),
        }),
      });

      const res = await service.getSubscriptions({
        page: 1,
        limit: 10,
        status: SubscriptionStatus.ACTIVE,
      });

      expect(res.pagination.total).toBe(1);
      expect(res.pagination.page).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].business?.name).toBe('Merchant Store');
      expect(res.items[0].business?.owner?.email).toBe('owner@merchant.com');
      expect(res.items[0].plan?.name).toBe('Growth Plan');
      expect(res.items[0].usage?.conversationMinutes).toBe(150);
    });

    it('should update subscription plan and status via admin override', async () => {
      const subId = new Types.ObjectId();
      const subDoc = {
        _id: subId,
        planId: 'growth',
        status: SubscriptionStatus.ACTIVE,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSubscriptionModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(subDoc),
      });

      mockPlanModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ planId: 'scale' }),
      });

      const updated = await service.updateSubscriptionAdmin(subId.toString(), {
        planId: 'scale',
        status: SubscriptionStatus.TRIALING,
        adminNotes: 'VIP Merchant trial extension',
      });

      expect(updated.planId).toBe('scale');
      expect(updated.status).toBe(SubscriptionStatus.TRIALING);
      expect(subDoc.save).toHaveBeenCalled();
    });
  });

  describe('Billing Telemetry', () => {
    it('should aggregate MRR, ARR, and provider distribution', async () => {
      mockSubscriptionModel.countDocuments
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(10) }) // active
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(2) })  // trialing
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(1) })  // pastDue
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(0) })  // suspended
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(3) })  // canceled
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(4) }); // renewalsDue7Days

      mockSubscriptionModel.aggregate
        .mockReturnValueOnce([
          { _id: 'stripe', count: 8 },
          { _id: 'bkash', count: 2 },
        ])
        .mockReturnValueOnce([
          { _id: 'growth', count: 7 },
          { _id: 'scale', count: 3 },
        ]);

      mockSubscriptionModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              ...Array(7).fill({ planId: 'growth' }),
              ...Array(3).fill({ planId: 'scale' }),
            ]),
          }),
        }),
      });

      mockPlanModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { planId: 'growth', priceUsdCents: 4900 },
            { planId: 'scale', priceUsdCents: 19900 },
          ]),
        }),
      });

      const stats = await service.getBillingOverviewStats();

      // 7 * 49 + 3 * 199 = 343 + 597 = 940 USD MRR
      expect(stats.overview.mrrUsd).toBe(940);
      expect(stats.overview.arrUsd).toBe(11280);
      expect(stats.overview.activeSubscriptions).toBe(10);
      expect(stats.overview.renewalsDue7Days).toBe(4);
      expect(stats.providers.stripe).toBe(8);
      expect(stats.providers.bkash).toBe(2);
      expect(stats.couponTelemetry.totalCoupons).toBe(5);
    });
  });
});
