import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CouponService } from './coupon.service';
import { Coupon, CouponDiscountType } from '../schemas/coupon.schema';
import { CouponRedemption, CouponRedemptionStatus } from '../schemas/coupon-redemption.schema';
import { BillingProvider } from '../schemas/subscription.schema';

describe('CouponService', () => {
  let service: CouponService;
  let couponModel: any;
  let redemptionModel: any;

  const growth = {
    planId: 'growth',
    priceUsdCents: 4900,
    priceBdtPaisa: 590000,
  } as any;

  const baseCoupon = (overrides: Partial<Coupon> = {}) =>
    ({
      _id: 'coupon_1',
      code: 'SAVE20',
      discountType: CouponDiscountType.PERCENT,
      percentOff: 20,
      amountOffUsdCents: 0,
      amountOffBdtPaisa: 0,
      appliesToPlanIds: [],
      maxRedemptions: null,
      redeemedCount: 0,
      maxRedemptionsPerBusiness: 1,
      validFrom: null,
      expiresAt: null,
      isActive: true,
      ...overrides,
    }) as any;

  beforeEach(async () => {
    couponModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    redemptionModel = {
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: getModelToken(Coupon.name), useValue: couponModel },
        { provide: getModelToken(CouponRedemption.name), useValue: redemptionModel },
      ],
    }).compile();

    service = module.get<CouponService>(CouponService);
  });

  describe('validate', () => {
    it('matches a code whatever case it was typed in', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon()),
      });

      await service.validate('  save20 ', 'biz_1', 'growth');

      expect(couponModel.findOne).toHaveBeenCalledWith({ code: 'SAVE20' });
    });

    it('rejects a deactivated coupon', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon({ isActive: false })),
      });

      await expect(service.validate('SAVE20', 'biz_1', 'growth')).rejects.toMatchObject({
        code: 'COUPON_INVALID',
      });
    });

    it('rejects an expired coupon', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          baseCoupon({ expiresAt: new Date(Date.now() - 1000) }),
        ),
      });

      await expect(service.validate('SAVE20', 'biz_1', 'growth')).rejects.toMatchObject({
        code: 'COUPON_EXPIRED',
      });
    });

    it('rejects a coupon scoped to other plans', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon({ appliesToPlanIds: ['scale'] })),
      });

      await expect(service.validate('SAVE20', 'biz_1', 'growth')).rejects.toMatchObject({
        code: 'COUPON_NOT_APPLICABLE',
      });
    });

    it('rejects a coupon that hit its global limit', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          baseCoupon({ maxRedemptions: 5, redeemedCount: 5 }),
        ),
      });

      await expect(service.validate('SAVE20', 'biz_1', 'growth')).rejects.toMatchObject({
        code: 'COUPON_EXHAUSTED',
      });
    });

    it('rejects a second use by the same tenant', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon()),
      });
      redemptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await expect(service.validate('SAVE20', 'biz_1', 'growth')).rejects.toMatchObject({
        code: 'COUPON_ALREADY_USED',
      });
    });

    it('counts a reservation held by another checkout against the tenant limit', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon()),
      });
      redemptionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.validate('SAVE20', 'biz_1', 'growth');

      expect(redemptionModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: {
            $in: [CouponRedemptionStatus.RESERVED, CouponRedemptionStatus.APPLIED],
          },
        }),
      );
    });
  });

  describe('quote', () => {
    it('takes a percentage off the USD price for Stripe', () => {
      const quote = service.quote(growth, baseCoupon(), BillingProvider.STRIPE);

      expect(quote).toMatchObject({
        currency: 'USD',
        amountBeforeMinor: 4900,
        discountMinor: 980,
        amountAfterMinor: 3920,
        coversFullPrice: false,
      });
    });

    it('takes a percentage off the BDT price for bKash', () => {
      const quote = service.quote(growth, baseCoupon(), BillingProvider.BKASH);

      expect(quote).toMatchObject({
        currency: 'BDT',
        amountBeforeMinor: 590000,
        discountMinor: 118000,
        amountAfterMinor: 472000,
      });
    });

    it('uses the per-currency amount of a fixed coupon', () => {
      const coupon = baseCoupon({
        discountType: CouponDiscountType.FIXED,
        percentOff: 0,
        amountOffUsdCents: 1000,
        amountOffBdtPaisa: 120000,
      });

      expect(service.quote(growth, coupon, BillingProvider.STRIPE).amountAfterMinor).toBe(3900);
      expect(service.quote(growth, coupon, BillingProvider.BKASH).amountAfterMinor).toBe(470000);
    });

    it('never lets a discount push the price below zero', () => {
      const coupon = baseCoupon({
        discountType: CouponDiscountType.FIXED,
        percentOff: 0,
        amountOffUsdCents: 999999,
      });

      const quote = service.quote(growth, coupon, BillingProvider.STRIPE);

      expect(quote.discountMinor).toBe(4900);
      expect(quote.amountAfterMinor).toBe(0);
      expect(quote.coversFullPrice).toBe(true);
    });
  });

  describe('reserve', () => {
    it('claims a slot with a conditional increment rather than a read then write', async () => {
      couponModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon({ redeemedCount: 1 })),
      });
      const saved = { _id: 'red_1' };
      (service as any).redemptionModel = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(saved),
      }));

      const quote = service.quote(growth, baseCoupon(), BillingProvider.STRIPE);
      await service.reserve(baseCoupon(), 'biz_1', 'growth', BillingProvider.STRIPE, quote);

      const [filter, update] = couponModel.findOneAndUpdate.mock.calls[0];
      expect(update).toEqual({ $inc: { redeemedCount: 1 } });
      expect(filter.$or).toEqual([
        { maxRedemptions: null },
        { $expr: { $lt: ['$redeemedCount', '$maxRedemptions'] } },
      ]);
    });

    it('refuses when the conditional increment loses the race', async () => {
      couponModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const quote = service.quote(growth, baseCoupon(), BillingProvider.STRIPE);

      await expect(
        service.reserve(baseCoupon(), 'biz_1', 'growth', BillingProvider.STRIPE, quote),
      ).rejects.toMatchObject({ code: 'COUPON_EXHAUSTED' });
    });
  });

  describe('release', () => {
    it('gives the slot back exactly once', async () => {
      redemptionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'red_1', couponId: 'coupon_1' }),
      });

      await service.release('red_1');

      expect(redemptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'red_1', status: CouponRedemptionStatus.RESERVED },
        { $set: { status: CouponRedemptionStatus.RELEASED } },
        { returnDocument: 'after' },
      );
      expect(couponModel.updateOne).toHaveBeenCalledWith(
        { _id: 'coupon_1', redeemedCount: { $gt: 0 } },
        { $inc: { redeemedCount: -1 } },
      );
    });

    it('does not decrement twice for an already released redemption', async () => {
      redemptionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.release('red_1');

      expect(couponModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('createAdmin', () => {
    it('refuses a duplicate code', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon()),
      });

      await expect(
        service.createAdmin({ code: 'save20', discountType: CouponDiscountType.PERCENT, percentOff: 20 } as any),
      ).rejects.toMatchObject({ code: 'COUPON_CODE_TAKEN' });
    });

    it('refuses a percentage coupon outside 1–100', async () => {
      couponModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.createAdmin({ code: 'BAD', discountType: CouponDiscountType.PERCENT, percentOff: 150 } as any),
      ).rejects.toMatchObject({ code: 'COUPON_INVALID_DISCOUNT' });
    });

    it('refuses a fixed coupon with no amount in either currency', async () => {
      couponModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.createAdmin({ code: 'BAD2', discountType: CouponDiscountType.FIXED } as any),
      ).rejects.toMatchObject({ code: 'COUPON_INVALID_DISCOUNT' });
    });
  });

  describe('updateAdmin', () => {
    it('ignores attempts to edit the code or the redemption count', async () => {
      couponModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon()),
      });

      await service.updateAdmin('coupon_1', {
        code: 'OTHER',
        redeemedCount: 0,
        notes: 'partner launch',
      } as any);

      expect(couponModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'coupon_1',
        { $set: { notes: 'partner launch' } },
        { new: true },
      );
    });
  });

  describe('discount type isolation', () => {
    it('stores a fixed coupon with no percentage left behind', async () => {
      couponModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const saved: any[] = [];
      (service as any).couponModel = Object.assign(
        jest.fn().mockImplementation((doc: any) => {
          saved.push(doc);
          return { save: jest.fn().mockResolvedValue(doc) };
        }),
        couponModel,
      );

      await service.createAdmin({
        code: 'FLAT29',
        discountType: CouponDiscountType.FIXED,
        percentOff: 29,
        amountOffUsdCents: 2900,
        amountOffBdtPaisa: 320000,
      } as any);

      expect(saved[0]).toMatchObject({
        discountType: CouponDiscountType.FIXED,
        percentOff: 0,
        amountOffUsdCents: 2900,
      });
    });

    it('clears the amounts when a coupon is switched to percentage', async () => {
      couponModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseCoupon()),
      });

      await service.updateAdmin('coupon_1', {
        discountType: CouponDiscountType.PERCENT,
        percentOff: 10,
      } as any);

      expect(couponModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'coupon_1',
        {
          $set: {
            discountType: CouponDiscountType.PERCENT,
            percentOff: 10,
            amountOffUsdCents: 0,
            amountOffBdtPaisa: 0,
          },
        },
        { new: true },
      );
    });

    it('never reads percentOff for a fixed coupon, even if one is stored', () => {
      const legacy = baseCoupon({
        discountType: CouponDiscountType.FIXED,
        percentOff: 29,
        amountOffUsdCents: 2900,
        amountOffBdtPaisa: 320000,
      });

      const quote = service.quote(growth, legacy, BillingProvider.STRIPE);

      // 29% of $49 would be $14.21. A fixed $29 coupon must take $29.
      expect(quote.discountMinor).toBe(2900);
      expect(quote.amountAfterMinor).toBe(2000);
    });

    it('refuses a fixed coupon that carries no amount in either currency', async () => {
      couponModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          baseCoupon({
            discountType: CouponDiscountType.FIXED,
            percentOff: 29,
            amountOffUsdCents: 0,
            amountOffBdtPaisa: 0,
          }),
        ),
      });

      await expect(service.validate('SAVE20', 'biz_1', 'growth')).rejects.toMatchObject({
        code: 'COUPON_INVALID',
      });
    });
  });
});
