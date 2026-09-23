import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plan, PlanDocument } from '../schemas/plan.schema';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
  BillingProvider,
} from '../schemas/subscription.schema';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
} from '../schemas/payment-transaction.schema';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { AdminUser, AdminUserDocument } from '../../users/schemas/admin-user.schema';
import { Invoice, InvoiceDocument } from '../../invoices/schemas/invoice.schema';
import { CouponService } from './coupon.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { QuerySubscriptionsDto } from '../dto/query-subscriptions.dto';
import { UpdateSubscriptionAdminDto } from '../dto/update-subscription-admin.dto';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/utils/pagination.util';
import { DomainException } from '../../common/exceptions/domain.exception';
import { RedisService } from '../../common/redis/redis.service';

export interface EnrichedSubscription {
  id: string;
  businessId: string;
  business: {
    id: string;
    name: string;
    domain: string;
    status: string;
    connectedPlatform?: string;
    owner?: {
      email: string;
      name: string;
    } | null;
  } | null;
  planId: string;
  plan: {
    name: string;
    priceUsdCents: number;
    priceBdtPaisa: number;
    billingInterval: string;
  } | null;
  billingProvider: BillingProvider;
  providerRef?: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  appliedCoupon?: any;
  adminNotes?: string;
  usage?: {
    conversationMinutes: number;
    ordersPerMonth: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BillingManagementService {
  private readonly logger = new Logger(BillingManagementService.name);

  constructor(
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(PaymentTransaction.name)
    private readonly transactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    private readonly couponService: CouponService,
    private readonly redisService: RedisService,
  ) {}

  // ==========================================
  // 1. SUBSCRIPTION PLAN MANAGEMENT (CRUD)
  // ==========================================

  /**
   * Retrieves all subscription plans.
   */
  async getAllPlans(includeInactive: boolean = true): Promise<PlanDocument[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return this.planModel.find(filter).sort({ sortOrder: 1, priceUsdCents: 1 }).exec();
  }

  /**
   * Retrieves single plan by planId or MongoDB ID.
   */
  async getPlanById(idOrPlanId: string): Promise<PlanDocument> {
    const isObjectId = Types.ObjectId.isValid(idOrPlanId);
    const filter = isObjectId
      ? { $or: [{ _id: new Types.ObjectId(idOrPlanId) }, { planId: idOrPlanId }] }
      : { planId: idOrPlanId.toLowerCase().trim() };

    const plan = await this.planModel.findOne(filter).exec();
    if (!plan) {
      throw new DomainException(
        'PLAN_NOT_FOUND',
        `Plan '${idOrPlanId}' was not found.`,
        HttpStatus.NOT_FOUND,
      );
    }
    return plan;
  }

  /**
   * Creates a new subscription plan tier.
   */
  async createPlan(dto: CreatePlanDto): Promise<PlanDocument> {
    const normalizedPlanId = dto.planId.trim().toLowerCase();

    const existing = await this.planModel.findOne({ planId: normalizedPlanId }).exec();
    if (existing) {
      throw new DomainException(
        'PLAN_ALREADY_EXISTS',
        `Plan with ID '${normalizedPlanId}' already exists.`,
        HttpStatus.CONFLICT,
      );
    }

    const created = new this.planModel({
      ...dto,
      planId: normalizedPlanId,
    });

    return created.save();
  }

  /**
   * Updates an existing subscription plan.
   */
  async updatePlan(idOrPlanId: string, dto: UpdatePlanDto): Promise<PlanDocument> {
    const plan = await this.getPlanById(idOrPlanId);

    if (dto.planId && dto.planId.toLowerCase().trim() !== plan.planId) {
      const targetId = dto.planId.toLowerCase().trim();
      const duplicate = await this.planModel.findOne({ planId: targetId }).exec();
      if (duplicate) {
        throw new DomainException(
          'PLAN_ALREADY_EXISTS',
          `Cannot rename to '${targetId}', planId is already taken.`,
          HttpStatus.CONFLICT,
        );
      }
      dto.planId = targetId;
    }

    const updated = await this.planModel
      .findByIdAndUpdate(plan._id, { $set: dto }, { new: true })
      .exec();

    return updated!;
  }

  /**
   * Deletes a plan. If any subscriptions are actively using it, deactivates it instead.
   */
  async deletePlan(
    idOrPlanId: string,
  ): Promise<{ deleted: boolean; deactivated: boolean; message: string }> {
    const plan = await this.getPlanById(idOrPlanId);

    const activeSubscriptionsCount = await this.subscriptionModel
      .countDocuments({ planId: plan.planId, status: { $ne: SubscriptionStatus.CANCELED } })
      .exec();

    if (activeSubscriptionsCount > 0) {
      plan.isActive = false;
      await plan.save();
      return {
        deleted: false,
        deactivated: true,
        message: `Plan '${plan.name}' is currently used by ${activeSubscriptionsCount} active subscription(s). Deactivated instead of deleted.`,
      };
    }

    await this.planModel.findByIdAndDelete(plan._id).exec();
    return {
      deleted: true,
      deactivated: false,
      message: `Plan '${plan.name}' permanently deleted.`,
    };
  }

  // ==========================================
  // 2. RECENT SUBSCRIPTIONS (PAGINATION & FILTERING)
  // ==========================================

  /**
   * Retrieves paginated subscriptions across all merchants with multi-attribute filtering.
   */
  async getSubscriptions(
    query: QuerySubscriptionsDto,
  ): Promise<PaginatedResponse<EnrichedSubscription>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    if (query.planId && query.planId !== 'all') {
      filter.planId = query.planId;
    }

    if (query.billingProvider && query.billingProvider !== 'all') {
      filter.billingProvider = query.billingProvider;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    // Free-text search by business name, domain, owner email, or providerRef
    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');

      // Find matching businesses
      const matchingBusinesses = await this.businessModel
        .find({
          $or: [
            { name: searchRegex },
            { domain: searchRegex },
            { publishableKey: searchRegex },
          ],
        })
        .select('_id')
        .lean()
        .exec();

      // Find matching admin users (owners)
      const matchingUsers = await this.adminUserModel
        .find({
          $or: [{ email: searchRegex }, { name: searchRegex }],
        })
        .select('businessId')
        .lean()
        .exec();

      const matchedBusinessIds = [
        ...matchingBusinesses.map((b) => b._id),
        ...matchingUsers.map((u) => u.businessId).filter(Boolean),
      ];

      filter.$or = [
        { businessId: { $in: matchedBusinessIds } },
        { providerRef: searchRegex },
        { planId: searchRegex },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder =
      String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const [total, subscriptions] = await Promise.all([
      this.subscriptionModel.countDocuments(filter).exec(),
      this.subscriptionModel
        .find(filter)
        .sort(sort as any)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    // Batch resolve businesses, plans, owners, and usage
    const businessIds = subscriptions.map((s) => s.businessId).filter(Boolean);
    const planIds = Array.from(new Set(subscriptions.map((s) => s.planId)));

    const [businesses, plans, owners] = await Promise.all([
      this.businessModel
        .find({ _id: { $in: businessIds } } as any)
        .select('name domain status connectedPlatform')
        .lean()
        .exec(),
      this.planModel
        .find({ planId: { $in: planIds } })
        .select('planId name priceUsdCents priceBdtPaisa billingInterval')
        .lean()
        .exec(),
      this.adminUserModel
        .find({
          businessId: { $in: businessIds },
          role: { $in: ['owner', 'admin'] },
        } as any)
        .select('businessId email name role')
        .lean()
        .exec(),
    ]);

    const businessMap = new Map(businesses.map((b: any) => [b._id.toString(), b]));
    const planMap = new Map(plans.map((p: any) => [p.planId, p]));
    const ownerMap = new Map(owners.map((o: any) => [o.businessId?.toString(), o]));

    // Fetch Redis usage counters for current month
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const redisClient = this.redisService.getClient();

    const enrichedItems: EnrichedSubscription[] = await Promise.all(
      subscriptions.map(async (sub: any) => {
        const bIdStr = sub.businessId?.toString();
        const biz = businessMap.get(bIdStr);
        const plan = planMap.get(sub.planId);
        const owner = ownerMap.get(bIdStr);

        let usage: { conversationMinutes: number; ordersPerMonth: number } | undefined;
        try {
          const [mins, orders] = await Promise.all([
            redisClient.get(`usage:${bIdStr}:${currentPeriod}:conversationMinutes`),
            redisClient.get(`usage:${bIdStr}:${currentPeriod}:ordersPerMonth`),
          ]);
          usage = {
            conversationMinutes: mins ? parseInt(mins, 10) : 0,
            ordersPerMonth: orders ? parseInt(orders, 10) : 0,
          };
        } catch {
          // Redis read failure fallback
        }

        return {
          id: sub._id.toString(),
          businessId: bIdStr,
          business: biz
            ? {
                id: biz._id.toString(),
                name: biz.name,
                domain: biz.domain,
                status: biz.status,
                connectedPlatform: biz.connectedPlatform,
                owner: owner ? { email: owner.email, name: owner.name } : null,
              }
            : null,
          planId: sub.planId,
          plan: plan
            ? {
                name: plan.name,
                priceUsdCents: plan.priceUsdCents,
                priceBdtPaisa: plan.priceBdtPaisa,
                billingInterval: plan.billingInterval,
              }
            : null,
          billingProvider: sub.billingProvider,
          providerRef: sub.providerRef,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
          appliedCoupon: sub.appliedCoupon || null,
          adminNotes: sub.adminNotes || '',
          usage,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        };
      }),
    );

    return createPaginatedResponse(enrichedItems, total, page, limit);
  }

  /**
   * Retrieves single subscription detailed drilldown.
   */
  async getSubscriptionById(id: string): Promise<any> {
    const sub = await this.subscriptionModel.findById(id).lean().exec();
    if (!sub) {
      throw new DomainException(
        'SUBSCRIPTION_NOT_FOUND',
        `Subscription with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const bId = sub.businessId;

    const [business, plan, owner, transactions, invoices] = await Promise.all([
      this.businessModel.findById(bId).lean().exec(),
      this.planModel.findOne({ planId: sub.planId }).lean().exec(),
      this.adminUserModel.findOne({ businessId: bId, role: { $in: ['owner', 'admin'] } } as any).lean().exec(),
      this.transactionModel.find({ subscriptionId: sub._id } as any).sort({ createdAt: -1 }).limit(10).lean().exec(),
      this.invoiceModel.find({ businessId: bId } as any).sort({ createdAt: -1 }).limit(10).lean().exec(),
    ]);

    return {
      subscription: sub,
      business,
      plan,
      owner: owner ? { email: owner.email, name: owner.name } : null,
      recentTransactions: transactions,
      recentInvoices: invoices,
    };
  }

  /**
   * Administrative override of subscription attributes.
   */
  async updateSubscriptionAdmin(
    id: string,
    dto: UpdateSubscriptionAdminDto,
  ): Promise<SubscriptionDocument> {
    const sub = await this.subscriptionModel.findById(id).exec();
    if (!sub) {
      throw new DomainException(
        'SUBSCRIPTION_NOT_FOUND',
        `Subscription with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.planId && dto.planId !== sub.planId) {
      const plan = await this.planModel.findOne({ planId: dto.planId }).exec();
      if (!plan) {
        throw new DomainException(
          'PLAN_NOT_FOUND',
          `Plan '${dto.planId}' not found.`,
          HttpStatus.NOT_FOUND,
        );
      }
      sub.planId = dto.planId;
    }

    if (dto.status) {
      sub.status = dto.status;
    }

    if (dto.currentPeriodEnd) {
      sub.currentPeriodEnd = new Date(dto.currentPeriodEnd);
    }

    if (dto.cancelAtPeriodEnd !== undefined) {
      sub.cancelAtPeriodEnd = dto.cancelAtPeriodEnd;
    }

    if (dto.adminNotes !== undefined) {
      sub.adminNotes = dto.adminNotes;
    }

    await sub.save();

    this.logger.log(
      `[BillingManagementService] Subscription ${id} updated by admin. Plan: ${sub.planId}, Status: ${sub.status}`,
    );

    return sub;
  }

  /**
   * Administrative cancellation of subscription.
   */
  async cancelSubscriptionAdmin(
    id: string,
    immediate: boolean = false,
  ): Promise<SubscriptionDocument> {
    const sub = await this.subscriptionModel.findById(id).exec();
    if (!sub) {
      throw new DomainException(
        'SUBSCRIPTION_NOT_FOUND',
        `Subscription with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (immediate) {
      sub.status = SubscriptionStatus.CANCELED;
      sub.cancelAtPeriodEnd = false;
    } else {
      sub.cancelAtPeriodEnd = true;
    }

    await sub.save();
    return sub;
  }

  // ==========================================
  // 3. BILLING TELEMETRY & OVERVIEW STATS
  // ==========================================

  /**
   * Aggregates platform-wide billing telemetry.
   */
  async getBillingOverviewStats(): Promise<any> {
    const [
      activeCount,
      trialingCount,
      pastDueCount,
      suspendedCount,
      canceledCount,
      providerDistribution,
      planDistributionAgg,
      activeSubs,
      plans,
      couponTelemetry,
    ] = await Promise.all([
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.ACTIVE }).exec(),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.TRIALING }).exec(),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.PAST_DUE }).exec(),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.SUSPENDED }).exec(),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.CANCELED }).exec(),
      this.subscriptionModel.aggregate([
        { $group: { _id: '$billingProvider', count: { $sum: 1 } } },
      ]),
      this.subscriptionModel.aggregate([
        { $match: { status: SubscriptionStatus.ACTIVE } },
        { $group: { _id: '$planId', count: { $sum: 1 } } },
      ]),
      this.subscriptionModel
        .find({ status: SubscriptionStatus.ACTIVE })
        .select('planId')
        .lean()
        .exec(),
      this.planModel.find().lean().exec(),
      this.couponService.telemetryAdmin(),
    ]);

    const planPriceMap = new Map(plans.map((p) => [p.planId, p.priceUsdCents / 100]));

    let mrrUsd = 0;
    for (const sub of activeSubs) {
      const price = planPriceMap.get(sub.planId) || 0;
      mrrUsd += price;
    }

    const providers: Record<string, number> = {};
    for (const item of providerDistribution) {
      if (item._id) providers[item._id] = item.count;
    }

    const planCounts: Record<string, number> = {};
    for (const item of planDistributionAgg) {
      if (item._id) planCounts[item._id] = item.count;
    }

    // Calculate upcoming renewals in next 7 days
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const renewalsDue7Days = await this.subscriptionModel
      .countDocuments({
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { $gte: new Date(), $lte: in7Days },
      })
      .exec();

    return {
      overview: {
        mrrUsd: Math.round(mrrUsd * 100) / 100,
        arrUsd: Math.round(mrrUsd * 12 * 100) / 100,
        activeSubscriptions: activeCount,
        trialingSubscriptions: trialingCount,
        pastDueSubscriptions: pastDueCount,
        suspendedSubscriptions: suspendedCount,
        canceledSubscriptions: canceledCount,
        totalTrackedSubscriptions:
          activeCount + trialingCount + pastDueCount + suspendedCount + canceledCount,
        renewalsDue7Days,
      },
      providers,
      planDistribution: planCounts,
      couponTelemetry,
    };
  }
}
