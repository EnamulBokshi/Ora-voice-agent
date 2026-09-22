import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument, CouponDiscountType } from '../schemas/coupon.schema';
import {
  CouponRedemption,
  CouponRedemptionDocument,
  CouponRedemptionStatus,
} from '../schemas/coupon-redemption.schema';
import { PlanDocument } from '../schemas/plan.schema';
import { BillingProvider } from '../schemas/subscription.schema';
import { DomainException } from '../../common/exceptions/domain.exception';

export interface CouponQuote {
  code: string;
  discountType: CouponDiscountType;
  currency: 'USD' | 'BDT';
  amountBeforeMinor: number;
  discountMinor: number;
  amountAfterMinor: number;
  /** True when the discount covers the whole price, so no gateway charge is due. */
  coversFullPrice: boolean;
}

/**
 * Coupon validation, pricing and redemption accounting.
 *
 * Trust rule for the whole feature: a caller may send a code, a plan and a
 * provider. Every amount is derived here from the stored coupon and the stored
 * plan. No discount value ever enters from a request body.
 */
@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    @InjectModel(CouponRedemption.name)
    private readonly redemptionModel: Model<CouponRedemptionDocument>,
  ) {}

  private normalize(code: string): string {
    return (code || '').trim().toUpperCase();
  }

  /**
   * Resolves a code to a coupon the given tenant may use for the given plan.
   *
   * Every rejection is a DomainException with a distinct code, and none of them
   * reveal anything about a coupon the merchant is not entitled to beyond the fact
   * that this code is not usable by them now.
   */
  async validate(
    rawCode: string,
    businessId: string,
    planId: string,
  ): Promise<CouponDocument> {
    const coupon = await this.resolveUsableCoupon(rawCode, planId);

    const usedByTenant = await this.redemptionModel
      .countDocuments({
        couponId: coupon._id as any,
        businessId: businessId as any,
        status: {
          $in: [CouponRedemptionStatus.RESERVED, CouponRedemptionStatus.APPLIED],
        },
      })
      .exec();

    if (usedByTenant >= (coupon.maxRedemptionsPerBusiness ?? 1)) {
      throw new DomainException(
        'COUPON_ALREADY_USED',
        'You have already used that coupon.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return coupon;
  }

  /**
   * Checks a code for a visitor who has no tenant yet.
   *
   * Everything that does not depend on who is asking is checked here: the code, its
   * window, its plan scope and the global limit. The per-tenant limit cannot be
   * evaluated without a tenant, and is enforced later by `validate` at checkout, so
   * a code that passes here can still be refused when the visitor signs in.
   */
  async previewPublic(rawCode: string, planId: string): Promise<CouponDocument> {
    return this.resolveUsableCoupon(rawCode, planId);
  }

  /** Every check that does not depend on which tenant is asking. */
  private async resolveUsableCoupon(
    rawCode: string,
    planId: string,
  ): Promise<CouponDocument> {
    const code = this.normalize(rawCode);
    if (!code) {
      throw new DomainException(
        'COUPON_INVALID',
        'Enter a coupon code.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const coupon = await this.couponModel.findOne({ code }).exec();
    if (!coupon || !coupon.isActive) {
      throw new DomainException(
        'COUPON_INVALID',
        'That coupon code is not valid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = Date.now();
    if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) {
      throw new DomainException(
        'COUPON_NOT_STARTED',
        'That coupon is not active yet.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= now) {
      throw new DomainException(
        'COUPON_EXPIRED',
        'That coupon has expired.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // A coupon whose own figures do not match its type would silently discount
    // nothing (or the wrong amount), so it is refused rather than half-applied.
    const hasUsableDiscount =
      coupon.discountType === CouponDiscountType.PERCENT
        ? coupon.percentOff >= 1 && coupon.percentOff <= 100
        : coupon.amountOffUsdCents > 0 || coupon.amountOffBdtPaisa > 0;

    if (!hasUsableDiscount) {
      throw new DomainException(
        'COUPON_INVALID',
        'That coupon code is not valid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      coupon.appliesToPlanIds?.length > 0 &&
      !coupon.appliesToPlanIds.includes(planId)
    ) {
      throw new DomainException(
        'COUPON_NOT_APPLICABLE',
        'That coupon cannot be used on this plan.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      coupon.maxRedemptions !== null &&
      coupon.maxRedemptions !== undefined &&
      coupon.redeemedCount >= coupon.maxRedemptions
    ) {
      throw new DomainException(
        'COUPON_EXHAUSTED',
        'That coupon has reached its redemption limit.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return coupon;
  }

  /** Prices a plan under a coupon. Discounts never push a price below zero. */
  quote(
    plan: PlanDocument,
    coupon: CouponDocument,
    provider: BillingProvider,
  ): CouponQuote {
    const currency: 'USD' | 'BDT' =
      provider === BillingProvider.BKASH ? 'BDT' : 'USD';
    const amountBeforeMinor =
      currency === 'BDT' ? plan.priceBdtPaisa : plan.priceUsdCents;

    // The stored discountType alone decides the arithmetic. A fixed coupon reads its
    // per-currency amount and never its percentOff field, and vice versa.
    let discountMinor: number;
    if (coupon.discountType === CouponDiscountType.FIXED) {
      discountMinor =
        currency === 'BDT'
          ? (coupon.amountOffBdtPaisa ?? 0)
          : (coupon.amountOffUsdCents ?? 0);
    } else {
      discountMinor = Math.round((amountBeforeMinor * (coupon.percentOff ?? 0)) / 100);
    }

    discountMinor = Math.max(0, Math.min(amountBeforeMinor, discountMinor));
    const amountAfterMinor = amountBeforeMinor - discountMinor;

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      currency,
      amountBeforeMinor,
      discountMinor,
      amountAfterMinor,
      coversFullPrice: amountAfterMinor === 0,
    };
  }

  /**
   * Takes one redemption slot and records a reservation.
   *
   * The `$expr` guard makes the increment conditional on the stored count inside a
   * single atomic update, so two checkouts racing for the last slot cannot both win.
   */
  async reserve(
    coupon: CouponDocument,
    businessId: string,
    planId: string,
    provider: BillingProvider,
    quote: CouponQuote,
  ): Promise<CouponRedemptionDocument> {
    const claimed = await this.couponModel
      .findOneAndUpdate(
        {
          _id: coupon._id as any,
          isActive: true,
          $or: [
            { maxRedemptions: null },
            { $expr: { $lt: ['$redeemedCount', '$maxRedemptions'] } },
          ],
        },
        { $inc: { redeemedCount: 1 } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!claimed) {
      throw new DomainException(
        'COUPON_EXHAUSTED',
        'That coupon has reached its redemption limit.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return new this.redemptionModel({
      couponId: coupon._id as any,
      code: coupon.code,
      businessId: businessId as any,
      planId,
      billingProvider: provider,
      currency: quote.currency,
      amountBeforeMinor: quote.amountBeforeMinor,
      discountMinor: quote.discountMinor,
      amountAfterMinor: quote.amountAfterMinor,
      status: CouponRedemptionStatus.RESERVED,
    }).save();
  }

  /** Attaches the gateway reference so a webhook can find this reservation. */
  async attachProviderRef(
    redemptionId: string,
    providerRef: string,
  ): Promise<void> {
    await this.redemptionModel
      .updateOne({ _id: redemptionId as any }, { $set: { providerRef } })
      .exec();
  }

  async markApplied(
    redemptionId: string,
    refs: { subscriptionId?: string; transactionId?: string } = {},
  ): Promise<void> {
    await this.redemptionModel
      .updateOne(
        { _id: redemptionId as any, status: CouponRedemptionStatus.RESERVED },
        {
          $set: {
            status: CouponRedemptionStatus.APPLIED,
            ...(refs.subscriptionId
              ? { subscriptionId: refs.subscriptionId as any }
              : {}),
            ...(refs.transactionId
              ? { transactionId: refs.transactionId as any }
              : {}),
          },
        },
      )
      .exec();
  }

  /** Finds a reserved redemption by the gateway reference recorded at checkout. */
  async findReservedByProviderRef(
    providerRef: string,
  ): Promise<CouponRedemptionDocument | null> {
    if (!providerRef) return null;
    return this.redemptionModel
      .findOne({ providerRef, status: CouponRedemptionStatus.RESERVED })
      .exec();
  }

  /**
   * Returns an unused slot to the pool. Guarded on the RESERVED status so a double
   * release cannot drive `redeemedCount` below the number of real redemptions.
   */
  async release(redemptionId: string): Promise<void> {
    const released = await this.redemptionModel
      .findOneAndUpdate(
        { _id: redemptionId as any, status: CouponRedemptionStatus.RESERVED },
        { $set: { status: CouponRedemptionStatus.RELEASED } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!released) return;

    await this.couponModel
      .updateOne(
        { _id: released.couponId as any, redeemedCount: { $gt: 0 } },
        { $inc: { redeemedCount: -1 } },
      )
      .exec();
  }

  // ── Admin surface ────────────────────────────────────────────────────────────

  async listAdmin(): Promise<CouponDocument[]> {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async createAdmin(
    data: Partial<Coupon>,
    createdBy?: string,
  ): Promise<CouponDocument> {
    const code = this.normalize(data.code as string);
    const existing = await this.couponModel.findOne({ code }).exec();
    if (existing) {
      throw new DomainException(
        'COUPON_CODE_TAKEN',
        `The code ${code} is already in use. Pick a different code.`,
        HttpStatus.CONFLICT,
      );
    }

    this.assertCoherent(data);

    return new this.couponModel({
      ...this.normalizeDiscountFields(data),
      code,
      redeemedCount: 0,
      createdBy: (createdBy as any) ?? null,
    }).save();
  }

  async updateAdmin(
    id: string,
    data: Partial<Coupon>,
  ): Promise<CouponDocument | null> {
    // `code` and `redeemedCount` are immutable: editing either would detach a live
    // coupon from the redemptions already recorded against it.
    const { code, redeemedCount, ...rest } = data as any;

    if (Object.keys(rest).length > 0) {
      this.assertCoherent(rest, true);
    }

    return this.couponModel
      .findByIdAndUpdate(
        id,
        { $set: rest.discountType ? this.normalizeDiscountFields(rest) : rest },
        { new: true },
      )
      .exec();
  }

  async deleteAdmin(id: string): Promise<boolean> {
    // Deactivation, not deletion: redemptions must keep pointing at a real coupon.
    const res = await this.couponModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();
    return Boolean(res);
  }

  async redemptionsAdmin(couponId: string): Promise<CouponRedemptionDocument[]> {
    return this.redemptionModel
      .find({ couponId: couponId as any })
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
  }

  /**
   * Keeps exactly one discount field set.
   *
   * A percentage coupon stores no amounts and a fixed coupon stores no percentage,
   * so a coupon switched from one type to the other can never keep a stale figure
   * that a later `quote` would read.
   */
  private normalizeDiscountFields(data: Partial<Coupon>): Partial<Coupon> {
    if (data.discountType === CouponDiscountType.PERCENT) {
      return { ...data, amountOffUsdCents: 0, amountOffBdtPaisa: 0 };
    }
    if (data.discountType === CouponDiscountType.FIXED) {
      return { ...data, percentOff: 0 };
    }
    return data;
  }

  /** Rejects a coupon whose discount fields do not match its discount type. */
  private assertCoherent(data: Partial<Coupon>, partial = false): void {
    const type = data.discountType;
    if (!type && partial) return;

    if (type === CouponDiscountType.PERCENT) {
      const percent = Number(data.percentOff ?? 0);
      if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
        throw new DomainException(
          'COUPON_INVALID_DISCOUNT',
          'Enter a percentage between 1 and 100 for a percentage coupon.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (type === CouponDiscountType.FIXED) {
      const usd = Number(data.amountOffUsdCents ?? 0);
      const bdt = Number(data.amountOffBdtPaisa ?? 0);
      if (usd <= 0 && bdt <= 0) {
        throw new DomainException(
          'COUPON_INVALID_DISCOUNT',
          'Enter an amount in USD or BDT for a fixed-amount coupon.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
}
