import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CouponService } from './coupon.service';
import {
  Coupon,
  CouponDiscountType,
  CouponCurrency,
} from '../schemas/coupon.schema';
import { CouponRedemption } from '../schemas/coupon-redemption.schema';
import { Plan } from '../schemas/plan.schema';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('CouponService', () => {
  let service: CouponService;
  let mockCouponModel: any;
  let mockRedemptionModel: any;
  let mockPlanModel: any;

  beforeEach(async () => {
    mockCouponModel = function (dto: any) {
      return {
        ...dto,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          ...dto,
        }),
      };
    };
    mockCouponModel.findOne = jest.fn();
    mockCouponModel.findById = jest.fn();
    mockCouponModel.find = jest.fn();
    mockCouponModel.countDocuments = jest.fn();
    mockCouponModel.findByIdAndUpdate = jest.fn();
    mockCouponModel.findByIdAndDelete = jest.fn();
    mockCouponModel.aggregate = jest.fn();

    mockRedemptionModel = function (dto: any) {
      return {
        ...dto,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          ...dto,
        }),
      };
    };
    mockRedemptionModel.countDocuments = jest.fn();
    mockRedemptionModel.find = jest.fn();
    mockRedemptionModel.aggregate = jest.fn();

    mockPlanModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: getModelToken(Coupon.name), useValue: mockCouponModel },
        {
          provide: getModelToken(CouponRedemption.name),
          useValue: mockRedemptionModel,
        },
        { provide: getModelToken(Plan.name), useValue: mockPlanModel },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
  });

  describe('createCoupon', () => {
    it('should create a coupon with uppercase code', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const res = await service.createCoupon({
        code: 'save20',
        description: 'Save 20% off',
        discountType: CouponDiscountType.PERCENTAGE,
        discountAmount: 20,
      });

      expect(res.code).toBe('SAVE20');
    });

    it('should throw Conflict if coupon code already exists', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ code: 'SAVE20' }),
      });

      await expect(
        service.createCoupon({
          code: 'SAVE20',
          description: 'Duplicate',
          discountType: CouponDiscountType.PERCENTAGE,
          discountAmount: 20,
        }),
      ).rejects.toThrow(DomainException);
    });

    it('should throw if percentage discount is > 100', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.createCoupon({
          code: 'INVALID',
          description: 'Over 100%',
          discountType: CouponDiscountType.PERCENTAGE,
          discountAmount: 120,
        }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('validateCoupon', () => {
    it('should throw if coupon does not exist', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.validateCoupon('NONEXISTENT', 'growth'),
      ).rejects.toThrow(/does not exist/);
    });

    it('should throw if coupon is inactive', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          code: 'INACTIVE',
          isActive: false,
        }),
      });

      await expect(
        service.validateCoupon('INACTIVE', 'growth'),
      ).rejects.toThrow(/is currently inactive/);
    });

    it('should throw if coupon is expired', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          code: 'EXPIRED',
          isActive: true,
          validFrom: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        }),
      });

      await expect(
        service.validateCoupon('EXPIRED', 'growth'),
      ).rejects.toThrow(/has expired/);
    });

    it('should throw if platform maxRedemptions reached', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          code: 'LIMITED',
          isActive: true,
          maxRedemptions: 5,
          redemptionsCount: 5,
        }),
      });

      await expect(
        service.validateCoupon('LIMITED', 'growth'),
      ).rejects.toThrow(/reached its maximum total redemptions/);
    });

    it('should throw if single tenant maxRedemptions reached', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          code: 'ONCE_PER_TENANT',
          isActive: true,
          maxRedemptions: 100,
          redemptionsCount: 10,
          maxRedemptionsPerTenant: 1,
        }),
      });

      mockRedemptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await expect(
        service.validateCoupon('ONCE_PER_TENANT', 'growth', '65f0a0a0a0a0a0a0a0a0a0a0'),
      ).rejects.toThrow(/already used coupon code/);
    });

    it('should throw if coupon not applicable to plan', async () => {
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          code: 'SCALE_ONLY',
          isActive: true,
          applicablePlans: ['scale'],
        }),
      });

      await expect(
        service.validateCoupon('SCALE_ONLY', 'growth'),
      ).rejects.toThrow(/not applicable to the 'growth' plan/);
    });

    it('should accurately calculate discount for valid coupon', async () => {
      const couponId = new Types.ObjectId();
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: couponId,
          code: 'PROMO20',
          isActive: true,
          discountType: CouponDiscountType.PERCENTAGE,
          discountAmount: 20,
          currency: CouponCurrency.ALL,
          applicablePlans: ['growth'],
          maxRedemptions: 100,
          redemptionsCount: 5,
          maxRedemptionsPerTenant: 1,
          duration: 'once',
        }),
      });

      mockRedemptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      mockPlanModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          planId: 'growth',
          name: 'Growth Plan',
          priceUsdCents: 4900,
          priceBdtPaisa: 550000,
        }),
      });

      const res = await service.validateCoupon('PROMO20', 'growth', '65f0a0a0a0a0a0a0a0a0a0a0', 'USD');
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(980); // 20% of 4900
      expect(res.finalAmount).toBe(3920);
      expect(res.effectivePercentage).toBe(20);
    });
  });

  describe('redeemCoupon', () => {
    it('should create redemption audit record and atomically increment redemptionsCount', async () => {
      const couponId = new Types.ObjectId();
      mockCouponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: couponId,
          code: 'PROMO20',
          isActive: true,
          discountType: CouponDiscountType.PERCENTAGE,
          discountAmount: 20,
          currency: CouponCurrency.ALL,
          applicablePlans: [],
          maxRedemptions: 100,
          redemptionsCount: 5,
          maxRedemptionsPerTenant: 2,
          duration: 'once',
        }),
      });

      mockRedemptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      mockPlanModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          planId: 'growth',
          name: 'Growth Plan',
          priceUsdCents: 4900,
          priceBdtPaisa: 550000,
        }),
      });

      mockCouponModel.findByIdAndUpdate.mockResolvedValue({});

      const redemption = await service.redeemCoupon({
        code: 'PROMO20',
        planId: 'growth',
        businessId: '65f0a0a0a0a0a0a0a0a0a0a0',
        currency: 'USD',
      });

      expect(redemption.couponCode).toBe('PROMO20');
      expect(redemption.discountAmount).toBe(980);
      expect(redemption.finalAmount).toBe(3920);
      expect(mockCouponModel.findByIdAndUpdate).toHaveBeenCalledWith(
        couponId.toString(),
        { $inc: { redemptionsCount: 1 } },
      );
    });
  });
});
