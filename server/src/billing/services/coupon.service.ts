import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Coupon,
  CouponDocument,
  CouponDiscountType,
} from '../schemas/coupon.schema';
import {
  CouponRedemption,
  CouponRedemptionDocument,
} from '../schemas/coupon-redemption.schema';
import { Plan, PlanDocument } from '../schemas/plan.schema';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UpdateCouponDto } from '../dto/update-coupon.dto';
import { QueryCouponsDto } from '../dto/query-coupons.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/utils/pagination.util';
import { calculateDiscount } from '../utils/discount-calculator.util';
import { DomainException } from '../../common/exceptions/domain.exception';

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  couponId: string;
  discountType: CouponDiscountType;
  discountValue: number;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  effectivePercentage: number;
  currency: string;
  duration: string;
  durationInMonths?: number;
  message: string;
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    @InjectModel(CouponRedemption.name)
    private readonly redemptionModel: Model<CouponRedemptionDocument>,
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
  ) {}

  /**
   * Creates a new coupon code.
   */
  async createCoupon(
    dto: CreateCouponDto,
    adminUserId?: string,
  ): Promise<CouponDocument> {
    const normalizedCode = dto.code.trim().toUpperCase();

    const existing = await this.couponModel.findOne({ code: normalizedCode }).exec();
    if (existing) {
      throw new DomainException(
        'COUPON_ALREADY_EXISTS',
        `Coupon code '${normalizedCode}' already exists.`,
        HttpStatus.CONFLICT,
      );
    }

    if (
      dto.discountType === CouponDiscountType.PERCENTAGE &&
      (dto.discountAmount <= 0 || dto.discountAmount > 100)
    ) {
      throw new DomainException(
        'INVALID_PERCENTAGE_DISCOUNT',
        'Percentage discount must be between 1 and 100.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const created = new this.couponModel({
      ...dto,
      code: normalizedCode,
      createdBy: adminUserId ? new Types.ObjectId(adminUserId) : undefined,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
    });

    return created.save();
  }

  /**
   * Retrieves paginated coupon list with status, search, and type filters.
   */
  async getCoupons(
    query: QueryCouponsDto,
  ): Promise<PaginatedResponse<CouponDocument>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    const now = new Date();

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ code: searchRegex }, { description: searchRegex }];
    }

    if (query.discountType && query.discountType !== 'all') {
      filter.discountType = query.discountType;
    }

    if (query.currency && query.currency !== 'all') {
      filter.currency = { $in: [query.currency, 'ALL'] };
    }

    if (query.status && query.status !== 'all') {
      switch (query.status) {
        case 'active':
          filter.isActive = true;
          filter.validFrom = { $lte: now };
          filter.$and = [
            { $or: [{ validUntil: null }, { validUntil: { $gte: now } }] },
            {
              $or: [
                { maxRedemptions: null },
                { $expr: { $lt: ['$redemptionsCount', '$maxRedemptions'] } },
              ],
            },
          ];
          break;
        case 'inactive':
          filter.isActive = false;
          break;
        case 'expired':
          filter.validUntil = { $lt: now, $ne: null };
          break;
        case 'depleted':
          filter.maxRedemptions = { $ne: null };
          filter.$expr = { $gte: ['$redemptionsCount', '$maxRedemptions'] };
          break;
      }
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder =
      String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const [total, items] = await Promise.all([
      this.couponModel.countDocuments(filter).exec(),
      this.couponModel.find(filter).sort(sort as any).skip(skip).limit(limit).exec(),
    ]);

    return createPaginatedResponse(items, total, page, limit);
  }

  /**
   * Retrieves single coupon by ID.
   */
  async getCouponById(id: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) {
      throw new DomainException(
        'COUPON_NOT_FOUND',
        `Coupon with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }
    return coupon;
  }

  /**
   * Retrieves single coupon by code.
   */
  async getCouponByCode(code: string): Promise<CouponDocument | null> {
    return this.couponModel
      .findOne({ code: code.trim().toUpperCase() })
      .exec();
  }

  /**
   * Updates an existing coupon.
   */
  async updateCoupon(
    id: string,
    dto: UpdateCouponDto,
  ): Promise<CouponDocument> {
    if (dto.code) {
      dto.code = dto.code.trim().toUpperCase();
      const duplicate = await this.couponModel
        .findOne({ code: dto.code, _id: { $ne: id } })
        .exec();
      if (duplicate) {
        throw new DomainException(
          'COUPON_ALREADY_EXISTS',
          `Coupon code '${dto.code}' is already in use by another coupon.`,
          HttpStatus.CONFLICT,
        );
      }
    }

    if (
      dto.discountType === CouponDiscountType.PERCENTAGE &&
      dto.discountAmount !== undefined &&
      (dto.discountAmount <= 0 || dto.discountAmount > 100)
    ) {
      throw new DomainException(
        'INVALID_PERCENTAGE_DISCOUNT',
        'Percentage discount must be between 1 and 100.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.couponModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();

    if (!updated) {
      throw new DomainException(
        'COUPON_NOT_FOUND',
        `Coupon with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return updated;
  }

  /**
   * Deletes a coupon (deactivates if redemptions exist, hard-deletes if unused).
   */
  async deleteCoupon(id: string): Promise<{ deleted: boolean; deactivated: boolean; message: string }> {
    const coupon = await this.getCouponById(id);

    const redemptionsCount = await this.redemptionModel.countDocuments({
      couponId: coupon._id as any,
    }).exec();

    if (redemptionsCount > 0) {
      coupon.isActive = false;
      await coupon.save();
      return {
        deleted: false,
        deactivated: true,
        message: `Coupon has ${redemptionsCount} recorded redemptions. Deactivated instead of permanent deletion.`,
      };
    }

    await this.couponModel.findByIdAndDelete(id).exec();
    return {
      deleted: true,
      deactivated: false,
      message: 'Coupon permanently deleted.',
    };
  }

  /**
   * Validates a coupon code against a plan and optional business tenant.
   * Throws DomainException on error or returns calculated discount breakdown.
   */
  async validateCoupon(
    code: string,
    planId: string,
    businessId?: string,
    targetCurrency?: string,
  ): Promise<CouponValidationResult> {
    const normalizedCode = (code || '').trim().toUpperCase();
    if (!normalizedCode) {
      throw new DomainException(
        'COUPON_REQUIRED',
        'Coupon code is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const coupon = await this.couponModel.findOne({ code: normalizedCode }).exec();
    if (!coupon) {
      throw new DomainException(
        'COUPON_NOT_FOUND',
        `Coupon code '${normalizedCode}' does not exist.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!coupon.isActive) {
      throw new DomainException(
        'COUPON_INACTIVE',
        `Coupon code '${normalizedCode}' is currently inactive.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new DomainException(
        'COUPON_NOT_STARTED',
        `Coupon code '${normalizedCode}' is not active yet.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (coupon.validUntil && now > coupon.validUntil) {
      throw new DomainException(
        'COUPON_EXPIRED',
        `Coupon code '${normalizedCode}' has expired.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Platform-wide redemption limit check
    if (
      coupon.maxRedemptions !== null &&
      coupon.maxRedemptions !== undefined &&
      coupon.redemptionsCount >= coupon.maxRedemptions
    ) {
      throw new DomainException(
        'COUPON_MAX_REDEMPTIONS_REACHED',
        `Coupon code '${normalizedCode}' has reached its maximum total redemptions.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Tenant-specific redemption limit check
    if (businessId) {
      const tenantUses = await this.redemptionModel
        .countDocuments({
          couponId: coupon._id as any,
          businessId: new Types.ObjectId(businessId) as any,
        } as any)
        .exec();

      if (tenantUses >= coupon.maxRedemptionsPerTenant) {
        throw new DomainException(
          'COUPON_TENANT_LIMIT_REACHED',
          `Your store has already used coupon code '${normalizedCode}' the maximum allowable number of times (${coupon.maxRedemptionsPerTenant}).`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Applicable plans check
    if (
      coupon.applicablePlans &&
      coupon.applicablePlans.length > 0 &&
      !coupon.applicablePlans.includes('all') &&
      !coupon.applicablePlans.includes(planId)
    ) {
      throw new DomainException(
        'COUPON_NOT_APPLICABLE_TO_PLAN',
        `Coupon code '${normalizedCode}' is not applicable to the '${planId}' plan.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Currency check
    const curr = (targetCurrency || 'USD').toUpperCase();
    if (coupon.currency !== 'ALL' && coupon.currency !== curr) {
      throw new DomainException(
        'COUPON_CURRENCY_MISMATCH',
        `Coupon code '${normalizedCode}' is only valid for currency '${coupon.currency}'.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Fetch plan details to calculate accurate discount
    const plan = await this.planModel.findOne({ planId }).exec();
    if (!plan) {
      throw new DomainException(
        'PLAN_NOT_FOUND',
        `Plan '${planId}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const isBdt = curr === 'BDT';
    const originalAmount = isBdt ? plan.priceBdtPaisa : plan.priceUsdCents;

    // Minimum price requirement check
    if (coupon.minPlanPriceCents && originalAmount < coupon.minPlanPriceCents) {
      throw new DomainException(
        'COUPON_MIN_PRICE_NOT_MET',
        `Coupon requires a minimum plan value of ${coupon.minPlanPriceCents / 100} ${curr}.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Calculate discount using reusable utility
    const calc = calculateDiscount(
      originalAmount,
      coupon.discountType as any,
      coupon.discountAmount,
    );

    return {
      valid: true,
      code: coupon.code,
      couponId: (coupon._id as Types.ObjectId).toString(),
      discountType: coupon.discountType,
      discountValue: coupon.discountAmount,
      discountAmount: calc.discountAmount,
      originalAmount: calc.originalAmount,
      finalAmount: calc.finalAmount,
      effectivePercentage: calc.effectivePercentage,
      currency: curr,
      duration: coupon.duration,
      durationInMonths: coupon.durationInMonths,
      message: `Coupon '${coupon.code}' applied successfully. Saved ${calc.discountAmount / 100} ${curr} (${calc.effectivePercentage}% off).`,
    };
  }

  /**
   * Executes coupon redemption, records audit log, and increments coupon count.
   */
  async redeemCoupon(params: {
    code: string;
    planId: string;
    businessId: string;
    subscriptionId?: string;
    adminUserId?: string;
    currency?: string;
  }): Promise<CouponRedemptionDocument> {
    const validation = await this.validateCoupon(
      params.code,
      params.planId,
      params.businessId,
      params.currency,
    );

    // Create redemption record
    const redemption = new this.redemptionModel({
      couponId: new Types.ObjectId(validation.couponId),
      couponCode: validation.code,
      businessId: new Types.ObjectId(params.businessId),
      adminUserId: params.adminUserId ? new Types.ObjectId(params.adminUserId) : undefined,
      subscriptionId: params.subscriptionId ? new Types.ObjectId(params.subscriptionId) : undefined,
      planId: params.planId,
      originalAmount: validation.originalAmount,
      discountAmount: validation.discountAmount,
      finalAmount: validation.finalAmount,
      currency: validation.currency,
      redeemedAt: new Date(),
    });

    await redemption.save();

    // Increment redemptions counter atomically
    await this.couponModel.findByIdAndUpdate(validation.couponId, {
      $inc: { redemptionsCount: 1 },
    });

    this.logger.log(
      `[CouponService] Coupon '${validation.code}' redeemed by business '${params.businessId}' on plan '${params.planId}'. Discount: ${validation.discountAmount / 100} ${validation.currency}`,
    );

    return redemption;
  }

  /**
   * Retrieves paginated redemptions for a specific coupon.
   */
  async getCouponRedemptions(
    couponId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: any = { couponId: new Types.ObjectId(couponId) };

    const [total, redemptions] = await Promise.all([
      this.redemptionModel.countDocuments(filter).exec(),
      this.redemptionModel
        .find(filter)
        .sort({ redeemedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('businessId', 'name domain status')
        .populate('adminUserId', 'email name role')
        .lean()
        .exec(),
    ]);

    const formatted = redemptions.map((r: any) => ({
      id: r._id.toString(),
      couponCode: r.couponCode,
      business: r.businessId
        ? {
            id: r.businessId._id?.toString(),
            name: r.businessId.name,
            domain: r.businessId.domain,
            status: r.businessId.status,
          }
        : null,
      redeemedBy: r.adminUserId
        ? {
            id: r.adminUserId._id?.toString(),
            email: r.adminUserId.email,
            name: r.adminUserId.name,
          }
        : null,
      planId: r.planId,
      originalAmount: r.originalAmount,
      discountAmount: r.discountAmount,
      finalAmount: r.finalAmount,
      currency: r.currency,
      redeemedAt: r.redeemedAt,
    }));

    return createPaginatedResponse(formatted, total, page, limit);
  }

  /**
   * Platform-wide coupon metrics.
   */
  async getCouponTelemetry(): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    totalRedemptions: number;
    totalDiscountVolumeUsd: number;
    totalDiscountVolumeBdt: number;
  }> {
    const [totalCoupons, activeCoupons, redemptionsAgg] = await Promise.all([
      this.couponModel.countDocuments().exec(),
      this.couponModel.countDocuments({ isActive: true }).exec(),
      this.redemptionModel.aggregate([
        {
          $group: {
            _id: '$currency',
            totalDiscount: { $sum: '$discountAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    let totalRedemptions = 0;
    let totalDiscountVolumeUsd = 0;
    let totalDiscountVolumeBdt = 0;

    for (const item of redemptionsAgg) {
      totalRedemptions += item.count || 0;
      if (item._id === 'USD') {
        totalDiscountVolumeUsd += (item.totalDiscount || 0) / 100;
      } else if (item._id === 'BDT') {
        totalDiscountVolumeBdt += (item.totalDiscount || 0) / 100;
      }
    }

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      totalDiscountVolumeUsd: Math.round(totalDiscountVolumeUsd * 100) / 100,
      totalDiscountVolumeBdt: Math.round(totalDiscountVolumeBdt * 100) / 100,
    };
  }
}
