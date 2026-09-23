import { Injectable, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { AdminUser, AdminUserDocument } from '../users/schemas/admin-user.schema';
import { AdminRole } from '../users/enums/admin-role.enum';
import { Conversation, ConversationDocument, ConversationChannel } from '../conversations/schemas/conversation.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Subscription, SubscriptionDocument, SubscriptionStatus, BillingProvider } from '../billing/schemas/subscription.schema';
import { Order, OrderDocument, OrderSource } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { AgentConfig, AgentConfigDocument } from '../agent-config/schemas/agent-config.schema';
import { Plan, PlanDocument } from '../billing/schemas/plan.schema';
import { TrialLog, TrialLogDocument } from '../billing/schemas/trial-log.schema';
import {
  DailyUsageSummary,
  DailyUsageSummaryDocument,
} from '../usage/schemas/daily-usage-summary.schema';
import { RedisService } from '../common/redis/redis.service';
import { MailService } from '../mail/mail.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUserActionDto } from './dto/admin-user-action.dto';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformAgentDto } from './dto/update-platform-agent.dto';
import { UsageTrackingService } from '../usage/usage-tracking.service';
import { AgentProfileService } from '../common/agent-profile/agent-profile.service';
import { resolveArchetype } from '../common/constants/archetypes';

/**
 * Period-over-period change, as a signed percentage string.
 *
 * Returns null when the previous period was zero: there is no percentage change from
 * nothing, and a placeholder there would be the invented figure this replaced.
 */
function percentChange(current: number, previous: number): string | null {
  if (!previous || previous <= 0) return null;
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly agentProfileService: AgentProfileService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(AgentConfig.name)
    private readonly agentConfigModel: Model<AgentConfigDocument>,
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
    @InjectModel(TrialLog.name)
    private readonly trialLogModel: Model<TrialLogDocument>,
    @InjectModel(DailyUsageSummary.name)
    private readonly dailyUsageModel: Model<DailyUsageSummaryDocument>,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly usageTrackingService?: UsageTrackingService,
  ) { }

  async onModuleInit() {
    await this.seedSuperAdminOnStartup();
  }

  /**
   * Automated SuperAdmin & System Tenant Bootstrapper
   * Runs idempotently on server startup to guarantee platform readiness.
   */
  private async seedSuperAdminOnStartup(): Promise<void> {
    try {
      const adminEmail = (
        this.configService.get<string>('ADMIN_EMAIL') ||
        process.env.ADMIN_EMAIL ||
        'ora.admin@tryora.live'
      ).trim().toLowerCase();

      const adminPassword = (
        this.configService.get<string>('ADMIN_PASSWORD') ||
        process.env.ADMIN_PASSWORD ||
        'Admin@ora2026!'
      ).trim();

      const adminName = (
        this.configService.get<string>('ADMIN_NAME') ||
        process.env.ADMIN_NAME ||
        'Platform SuperAdmin'
      ).trim();

      // 1. Ensure System Business Tenant exists
      let systemBusiness = await this.businessModel.findOne({ publishableKey: 'biz_live_ora_platform_system' }).exec();
      if (!systemBusiness) {
        systemBusiness = await this.businessModel.findOne({ name: 'ORA Platform' }).exec();
      }

      if (!systemBusiness) {
        this.logger.log('[AdminService] Initializing System Tenant ("ORA Platform")...');
        systemBusiness = await this.businessModel.create({
          name: 'ORA Platform',
          domain: 'tryora.live',
          publishableKey: 'biz_live_ora_platform_system',
          keyStatus: 'active',
          status: 'active',
          connectedPlatform: 'none',
        });
      } else if (!systemBusiness.publishableKey) {
        systemBusiness.publishableKey = 'biz_live_ora_platform_system';
        await systemBusiness.save();
      }

      // 2. Ensure SuperAdmin User exists
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      let superAdmin = await this.adminUserModel.findOne({ email: adminEmail }).exec();
      if (!superAdmin) {
        superAdmin = await this.adminUserModel.findOne({ role: AdminRole.SUPER_ADMIN }).exec();
      }

      if (!superAdmin) {
        this.logger.log(`[AdminService] Provisioning SuperAdmin User: "${adminEmail}"...`);
        superAdmin = await this.adminUserModel.create({
          businessId: systemBusiness._id as any,
          email: adminEmail,
          passwordHash,
          name: adminName,
          role: AdminRole.SUPER_ADMIN,
          emailVerified: true,
        });
        this.logger.log(`[AdminService] SuperAdmin User created successfully: ${adminEmail}`);
      } else {
        let modified = false;
        if (!superAdmin.emailVerified) {
          superAdmin.emailVerified = true;
          modified = true;
        }
        if (superAdmin.role !== AdminRole.SUPER_ADMIN) {
          superAdmin.role = AdminRole.SUPER_ADMIN;
          modified = true;
        }
        if (superAdmin.email !== adminEmail) {
          superAdmin.email = adminEmail;
          modified = true;
        }
        if (adminName && superAdmin.name !== adminName) {
          superAdmin.name = adminName;
          modified = true;
        }
        const passwordMatches = await bcrypt.compare(adminPassword, superAdmin.passwordHash);
        if (!passwordMatches) {
          superAdmin.passwordHash = passwordHash;
          modified = true;
          this.logger.log(`[AdminService] SuperAdmin credentials synchronized with environment config.`);
        }
        if (modified) {
          await superAdmin.save();
        }
      }

      // 3. Ensure System AgentConfig exists
      let agentConfig = await this.agentConfigModel
        .findOne({
          businessId: systemBusiness._id as any,
          archetype: resolveArchetype(systemBusiness.activeArchetype),
        })
        .exec();
      if (!agentConfig) {
        await this.agentConfigModel.create({
          businessId: systemBusiness._id as any,
          archetype: resolveArchetype(systemBusiness.activeArchetype),
          businessSummary: 'ORA — The Autonomous Multimodal Voice AI Sales Brain & Storefront Assistant.',
          brandVoiceDescription: 'Authoritative, enthusiastic, and highly knowledgeable AI sales representative for ORA.',
          customDirectives: 'Highlight our sub-400ms streaming latency, 60-second zero-config setup, Stripe & bKash checkout, and automated DOM scraping.',
          isActive: true,
        });
        this.logger.log('[AdminService] AgentConfig created for ORA Platform.');
      }
    } catch (err: any) {
      this.logger.warn(`[AdminService] Auto-seed status: ${err.message}`);
    }
  }

  /**
   * Aggregates high-level platform-wide statistics for the SuperAdmin command center.
   */
  async getPlatformStats(period = '30d') {
    const businessFilter = { name: { $ne: 'ORA Platform' } };

    const [
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      pendingBusinesses,
      totalUsers,
      totalConversations,
      voiceConversationsCount,
      totalCustomers,
      totalProducts,
      totalOrders,
      oraAgentOrders,
      recentBusinesses,
      activeSubs,
      allPlans,
      totalGmvAgg,
      oraGmvAgg,
    ] = await Promise.all([
      this.businessModel.countDocuments(businessFilter),
      this.businessModel.countDocuments({ ...businessFilter, status: 'active' }),
      this.businessModel.countDocuments({ ...businessFilter, status: 'suspended' }),
      this.businessModel.countDocuments({ ...businessFilter, status: 'pending' }),
      this.adminUserModel.countDocuments(),
      this.conversationModel.countDocuments(),
      this.conversationModel.countDocuments({ channel: ConversationChannel.WIDGET_VOICE }),
      this.customerModel.countDocuments(),
      this.productModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ source: OrderSource.ORA_AGENT }),
      this.businessModel
        .find(businessFilter)
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      this.subscriptionModel.find({ status: SubscriptionStatus.ACTIVE }).lean(),
      this.planModel.find().lean(),
      this.orderModel.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { source: OrderSource.ORA_AGENT } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalGmv = totalGmvAgg[0]?.total || 0;
    const oraAgentGmv = oraGmvAgg[0]?.total || 0;
    const textConversationsCount = Math.max(0, totalConversations - voiceConversationsCount);

    // Plan distribution and MRR, priced from the plan catalogue.
    //
    // These used to be `platformMRR += 199` for scale and `+= 49` for growth, with
    // every other plan counted as free. That ignored the prices the admin console
    // actually edits, and it made starter subscribers invisible and worth nothing.
    // There is also deliberately no fallback distribution any more: an empty platform
    // reports zeros rather than an invented 60/15 split.
    const planPriceUsdByPlanId = new Map<string, number>(
      (allPlans as any[]).map((plan) => [
        plan.planId,
        (plan.priceUsdCents || 0) / 100,
      ]),
    );

    const planDistribution: Record<string, number> = {};
    let platformMRR = 0;

    for (const sub of activeSubs) {
      const planId = String(sub.planId || 'unknown');
      planDistribution[planId] = (planDistribution[planId] || 0) + 1;
      platformMRR += planPriceUsdByPlanId.get(planId) ?? 0;
    }

    platformMRR = Math.round(platformMRR * 100) / 100;
    const platformARR = Math.round(platformMRR * 12 * 100) / 100;

    // The tiers themselves, so the console can label and price them without
    // hardcoding a catalogue that changes under it.
    const planCatalogue = (allPlans as any[])
      .filter((plan) => plan.isActive !== false)
      .sort((a, b) => (a.priceUsdCents || 0) - (b.priceUsdCents || 0))
      .map((plan) => ({
        planId: plan.planId,
        name: plan.name,
        priceUsd: (plan.priceUsdCents || 0) / 100,
        priceBdt: (plan.priceBdtPaisa || 0) / 100,
        subscribers: planDistribution[plan.planId] || 0,
      }));

    // Time-series activity calculation for trend charts
    const numDays = period === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);
    startDate.setHours(0, 0, 0, 0);

    // The window immediately before this one, so a trend is a measurement rather
    // than a decorative string.
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - numDays);

    const dateKey = (d: Date) => d.toISOString().split('T')[0];

    const [dailyConvs, dailyStores, dailyOrders, dailyVoice, previousWindow] = await Promise.all([
      this.conversationModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            voice: {
              $sum: {
                $cond: [{ $eq: ['$channel', ConversationChannel.WIDGET_VOICE] }, 1, 0],
              },
            },
          },
        },
      ]),
      this.businessModel.aggregate([
        { $match: { name: { $ne: 'ORA Platform' }, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
          },
        },
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalAmount: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      // Real spoken time, not an assumed average per conversation.
      this.dailyUsageModel.aggregate([
        { $match: { date: { $gte: dateKey(startDate) } } },
        {
          $group: {
            _id: '$date',
            audioSeconds: {
              $sum: { $add: ['$audioInputSeconds', '$audioOutputSeconds'] },
            },
            sessions: { $sum: '$sessionsCount' },
          },
        },
      ]),
      Promise.all([
        this.businessModel.countDocuments({
          ...businessFilter,
          createdAt: { $gte: previousStartDate, $lt: startDate },
        }),
        this.dailyUsageModel.aggregate([
          {
            $match: {
              date: { $gte: dateKey(previousStartDate), $lt: dateKey(startDate) },
            },
          },
          {
            $group: {
              _id: null,
              audioSeconds: {
                $sum: { $add: ['$audioInputSeconds', '$audioOutputSeconds'] },
              },
            },
          },
        ]),
        this.subscriptionModel.find({
          status: SubscriptionStatus.ACTIVE,
          createdAt: { $lt: startDate },
        }).lean(),
      ]),
    ]);

    const convMap = new Map(dailyConvs.map((d: any) => [d._id, d]));
    const storeMap = new Map(dailyStores.map((d: any) => [d._id, d.total]));
    const orderMap = new Map(dailyOrders.map((d: any) => [d._id, d]));
    const voiceMap = new Map(
      (dailyVoice as any[]).map((d: any) => [d._id, d.audioSeconds || 0]),
    );

    const [previousNewStores, previousVoiceAgg, previousActiveSubs] =
      previousWindow as [number, any[], any[]];

    const activityTimeline: Array<{
      date: string;
      conversations: number;
      voiceMinutes: number;
      newStores: number;
      gmv: number;
    }> = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const convData: any = convMap.get(dateStr);
      const convCount = Number(convData?.total) || 0;
      const voiceMins = Math.round((Number(voiceMap.get(dateStr)) || 0) / 60);
      const newStores = Number(storeMap.get(dateStr)) || 0;
      const orderData: any = orderMap.get(dateStr);
      const gmv = Number(orderData?.totalAmount) || 0;

      activityTimeline.push({
        date: dateStr,
        conversations: convCount,
        voiceMinutes: voiceMins,
        newStores,
        gmv,
      });
    }

    // Total spoken minutes across the platform, from recorded audio seconds rather
    // than `voiceConversationsCount * 2.4`, which was an assumed average.
    const totalAudioAgg = await this.dailyUsageModel.aggregate([
      {
        $group: {
          _id: null,
          audioSeconds: {
            $sum: { $add: ['$audioInputSeconds', '$audioOutputSeconds'] },
          },
        },
      },
    ]);
    const totalVoiceMinutes = Math.round((totalAudioAgg[0]?.audioSeconds || 0) / 60);

    const periodVoiceSeconds = (dailyVoice as any[]).reduce(
      (sum: number, row: any) => sum + (row.audioSeconds || 0),
      0,
    );
    const previousVoiceSeconds = previousVoiceAgg[0]?.audioSeconds || 0;

    const previousMRR = (previousActiveSubs as any[]).reduce(
      (sum: number, sub: any) =>
        sum + (planPriceUsdByPlanId.get(String(sub.planId)) ?? 0),
      0,
    );

    const periodNewStores = (dailyStores as any[]).reduce(
      (sum: number, row: any) => sum + (row.total || 0),
      0,
    );

    // Redis Health Check
    let redisLatencyMs = 0;
    let redisStatus = 'healthy';
    try {
      const start = Date.now();
      await this.redisService.getClient().ping();
      redisLatencyMs = Date.now() - start;
    } catch (err) {
      redisStatus = 'degraded';
      redisLatencyMs = -1;
    }

    return {
      overview: {
        totalBusinesses,
        activeBusinesses,
        suspendedBusinesses,
        pendingBusinesses,
        totalUsers,
        totalConversations,
        voiceConversationsCount,
        textConversationsCount,
        totalVoiceMinutes,
        totalCustomers,
        totalOrders,
        totalGmv: Math.round(totalGmv * 100) / 100,
        oraAgentOrders,
        oraAgentGmv: Math.round(oraAgentGmv * 100) / 100,
        totalProducts,
        platformMRR,
        platformARR,
        planDistribution,
        planCatalogue,
        // Period over period, against the window of the same length before it. Null
        // where there is no prior figure to compare against: an unmeasurable trend is
        // reported as unmeasurable, not as a flattering constant.
        growth: {
          mrrTrend: percentChange(platformMRR, previousMRR),
          storeTrend: percentChange(periodNewStores, previousNewStores),
          voiceTrend: percentChange(periodVoiceSeconds, previousVoiceSeconds),
          comparedToDays: numDays,
        },
      },
      system: {
        serverUptimeSeconds: Math.floor(process.uptime()),
        nodeMemoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeMemoryTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        redisStatus,
        redisLatencyMs,
        mongoStatus:
          this.businessModel.db.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
      },
      recentSignups: recentBusinesses.map((b: any) => ({
        id: b._id.toString(),
        name: b.name,
        domain: b.domain || 'N/A',
        publishableKey: b.publishableKey,
        status: b.status || 'active',
        connectedPlatform: b.connectedPlatform || 'none',
        createdAt: b.createdAt,
      })),
      activityTimeline,
    };
  }

  /**
   * Every merchant who ever started a free trial, with where they are now.
   *
   * TrialLog is the register of grants — one row per domain, written when the trial is
   * given — so it is the only source that still shows a lead whose trial has since
   * lapsed or who never subscribed. The subscription is joined on top for the current
   * state, which is what turns a list of grants into a conversion funnel.
   */
  async getTrialLeads(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    // A trial leaves marks in three places, and none of them is complete on its own:
    // TrialLog is the anti-abuse register (one row per domain), Business carries
    // trialGrantedAt/trialExpiresAt, and the subscription carries hasUsedTrial. A
    // tenant granted a trial before the log existed, or through a path that did not
    // write one, is still a lead — so the list is the union of all three.
    const [trialLogs, plans, trialBusinesses, trialSubs] = await Promise.all([
      this.trialLogModel.find().sort({ grantedAt: -1 }).lean(),
      this.planModel.find().lean(),
      this.businessModel
        .find({ trialGrantedAt: { $exists: true, $ne: null } } as any)
        .lean(),
      this.subscriptionModel
        .find({
          $or: [{ hasUsedTrial: true }, { status: SubscriptionStatus.TRIALING }],
        } as any)
        .lean(),
    ]);

    const logByBusiness = new Map(
      (trialLogs as any[]).map((log) => [String(log.businessId), log]),
    );
    const trialBusinessById = new Map(
      (trialBusinesses as any[]).map((b) => [String(b._id), b]),
    );

    const businessIds = Array.from(
      new Set([
        ...(trialLogs as any[]).map((log) => String(log.businessId)),
        ...(trialBusinesses as any[]).map((b) => String(b._id)),
        ...(trialSubs as any[]).map((sub) => String(sub.businessId)),
      ]),
    );

    const [businesses, subscriptions, owners] = await Promise.all([
      this.businessModel.find({ _id: { $in: businessIds } } as any).lean(),
      this.subscriptionModel.find({ businessId: { $in: businessIds } } as any).lean(),
      this.adminUserModel
        .find({ businessId: { $in: businessIds } } as any)
        .select('name email businessId role createdAt lastLoginAt')
        .lean(),
    ]);

    const businessById = new Map(businesses.map((b: any) => [String(b._id), b]));
    const subByBusiness = new Map(
      subscriptions.map((sub: any) => [String(sub.businessId), sub]),
    );
    const planName = new Map(
      (plans as any[]).map((plan) => [plan.planId, plan.name]),
    );
    const planPriceUsd = new Map(
      (plans as any[]).map((plan) => [plan.planId, (plan.priceUsdCents || 0) / 100]),
    );

    // The owner is who an admin actually writes to. Fall back to the earliest account
    // on the tenant when no owner role was ever assigned.
    const ownerByBusiness = new Map<string, any>();
    for (const user of owners as any[]) {
      const key = String(user.businessId);
      const current = ownerByBusiness.get(key);
      const isOwner = user.role === AdminRole.OWNER;
      if (!current || (isOwner && current.role !== AdminRole.OWNER)) {
        ownerByBusiness.set(key, user);
      }
    }

    const now = Date.now();

    const leads = businessIds.map((businessId: string) => {
      const log: any = logByBusiness.get(businessId);
      const business: any =
        businessById.get(businessId) || trialBusinessById.get(businessId);
      const sub: any = subByBusiness.get(businessId);
      const owner = ownerByBusiness.get(businessId);

      // Prefer the anti-abuse register, which records the grant itself; fall back to
      // the tenant's own trial stamps, then to the subscription period.
      const startedAt =
        log?.grantedAt || business?.trialGrantedAt || sub?.currentPeriodStart || null;
      const rawExpiry =
        log?.trialExpiresAt || business?.trialExpiresAt || sub?.currentPeriodEnd || null;

      const expiresAt = rawExpiry ? new Date(rawExpiry) : new Date(0);
      const msRemaining = expiresAt.getTime() - now;
      const isTrialing = sub?.status === SubscriptionStatus.TRIALING;
      const isPaying = sub?.status === SubscriptionStatus.ACTIVE;

      // A trial that expired without a paid subscription is a lost lead, and one that
      // is running but nearly over is where an admin's time is worth most.
      let status: 'converted' | 'expiring_soon' | 'active' | 'expired' | 'lapsed';
      if (isPaying) {
        status = 'converted';
      } else if (isTrialing && msRemaining > 0) {
        status = msRemaining <= 3 * 24 * 60 * 60 * 1000 ? 'expiring_soon' : 'active';
      } else if (msRemaining <= 0) {
        status = 'expired';
      } else {
        status = 'lapsed';
      }

      const planId = sub?.planId || 'starter';

      return {
        businessId,
        storeName: business?.name || 'Unknown store',
        domain: log?.normalizedDomain || business?.normalizedDomain || business?.domain || '—',
        status,
        planId,
        planName: planName.get(planId) || planId,
        planPriceUsd: planPriceUsd.get(planId) ?? 0,
        ownerName: owner?.name || null,
        ownerEmail: owner?.email || log?.registeredEmail || null,
        registeredEmail: log?.registeredEmail || null,
        lastLoginAt: owner?.lastLoginAt || null,
        startedAt,
        expiresAt: rawExpiry,
        daysRemaining: msRemaining > 0 ? Math.ceil(msRemaining / (24 * 60 * 60 * 1000)) : 0,
        hoursRemaining: msRemaining > 0 ? Math.ceil(msRemaining / (60 * 60 * 1000)) : 0,
        subscriptionStatus: sub?.status || 'none',
        billingProvider: sub?.billingProvider || null,
        ipAddress: log?.ipAddress || null,
        businessStatus: business?.status || 'unknown',
        connectedPlatform: business?.connectedPlatform || 'none',
      };
    });

    const stats = {
      totalTrials: leads.length,
      active: leads.filter((l) => l.status === 'active').length,
      expiringSoon: leads.filter((l) => l.status === 'expiring_soon').length,
      expired: leads.filter((l) => l.status === 'expired' || l.status === 'lapsed').length,
      converted: leads.filter((l) => l.status === 'converted').length,
      conversionRate: leads.length
        ? Math.round(
            (leads.filter((l) => l.status === 'converted').length / leads.length) * 1000,
          ) / 10
        : 0,
      // What the converted trials are worth per month, priced from the plan catalogue.
      convertedMrrUsd:
        Math.round(
          leads
            .filter((l) => l.status === 'converted')
            .reduce((sum, l) => sum + l.planPriceUsd, 0) * 100,
        ) / 100,
    };

    let filtered = leads;
    if (query.status && query.status !== 'all') {
      filtered =
        query.status === 'expired'
          ? filtered.filter((l) => l.status === 'expired' || l.status === 'lapsed')
          : filtered.filter((l) => l.status === query.status);
    }

    if (query.search) {
      const needle = query.search.trim().toLowerCase();
      filtered = filtered.filter((l) =>
        [l.storeName, l.domain, l.ownerEmail, l.ownerName]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle)),
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;

    return {
      leads: filtered.slice(start, start + limit),
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Emails one trial lead a message an admin wrote.
   *
   * The recipient is resolved here from the tenant, never taken from the request: an
   * admin picks a lead from the list, and this endpoint cannot be turned into a way to
   * send ORA-branded mail to an arbitrary address.
   */
  async sendTrialOutreach(
    businessId: string,
    payload: { subject: string; message: string; ctaUrl?: string },
    sender: { name?: string; email?: string },
  ) {
    const business = await this.businessModel.findById(businessId).lean();
    if (!business) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        'That merchant no longer exists.',
        HttpStatus.NOT_FOUND,
      );
    }

    const owner = await this.adminUserModel
      .findOne({ businessId: businessId as any, role: AdminRole.OWNER } as any)
      .select('name email')
      .lean();

    const fallback = await this.adminUserModel
      .findOne({ businessId: businessId as any } as any)
      .sort({ createdAt: 1 })
      .select('name email')
      .lean();

    const recipient: any = owner || fallback;
    if (!recipient?.email) {
      throw new DomainException(
        'NO_CONTACTABLE_USER',
        'This merchant has no account with an email address to write to.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.mailService.sendAdminOutreachEmail(recipient.email, {
      recipientName: recipient.name || 'there',
      heading: payload.subject,
      message: payload.message,
      ctaUrl: payload.ctaUrl,
      ctaLabel: 'Open ORA',
      senderName: sender.name || 'The ORA team',
    });

    if (!result.delivered) {
      throw new DomainException(
        'EMAIL_NOT_SENT',
        result.reason === 'EMAIL_PROVIDER_NOT_CONFIGURED'
          ? 'No email provider is configured, so nothing was sent. Set RESEND_API_KEY.'
          : 'The email could not be sent. Nothing was delivered — please retry.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.logger.log(
      `[AdminService] Outreach sent to ${recipient.email} (business ${businessId}) by ${sender.email || 'platform admin'}.`,
    );

    return {
      delivered: true,
      to: recipient.email,
      storeName: (business as any).name,
    };
  }

  /**
   * Retrieves paginated list of merchant businesses with filtering & stats.
   */
  async getBusinesses(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: any = { name: { $ne: 'ORA Platform' } };
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { domain: { $regex: query.search, $options: 'i' } },
        { publishableKey: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [total, businesses] = await Promise.all([
      this.businessModel.countDocuments(filter),
      this.businessModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    // Attach owner info and conversation stats per business
    const enriched = await Promise.all(
      businesses.map(async (b: any) => {
        const owner = await this.adminUserModel
          .findOne({ businessId: b._id, role: { $in: ['owner', 'admin'] } } as any)
          .select('email name role createdAt')
          .lean();

        const conversationsCount = await this.conversationModel.countDocuments({
          businessId: b._id,
        } as any);

        const detectedOrigins = b.detectedOrigins || [];
        const isMultiSite = detectedOrigins.length > 1;
        const hasMismatch = detectedOrigins.some((o: any) => o.isMismatch);

        return {
          id: b._id.toString(),
          name: b.name,
          domain: b.domain || 'N/A',
          publishableKey: b.publishableKey || null,
          keyStatus: b.keyStatus || (b.publishableKey ? 'active' : 'none'),
          detectedOrigins,
          anomalyFlags: {
            isMultiSite,
            hasMismatch,
            activeOriginsCount: detectedOrigins.length,
          },
          status: b.status || 'active',
          connectedPlatform: b.connectedPlatform || 'none',
          ownerEmail: owner?.email || 'unassigned@ora.ai',
          ownerName: owner?.name || 'Store Owner',
          conversationsCount,
          keyRevokedAt: b.keyRevokedAt,
          keyRevokedBy: b.keyRevokedBy,
          createdAt: b.createdAt,
        };
      }),
    );

    return {
      businesses: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single business tenant detail drilldown.
   */
  async getBusinessById(businessId: string) {
    const business = await this.businessModel.findById(businessId).lean();
    if (!business) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        'Business tenant not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    const [owner, subscription, productsCount, ordersCount, conversationsCount] = await Promise.all([
      this.adminUserModel
        .findOne({ businessId: business._id, role: { $in: ['owner', 'admin'] } } as any)
        .select('name email role createdAt')
        .lean(),
      this.subscriptionModel.findOne({ businessId: business._id } as any).lean(),
      this.productModel.countDocuments({ businessId: business._id } as any),
      this.orderModel.countDocuments({ businessId: business._id } as any),
      this.conversationModel.countDocuments({ businessId: business._id } as any),
    ]);

    const detectedOrigins = (business as any).detectedOrigins || [];
    const isMultiSite = detectedOrigins.length > 1;
    const hasMismatch = detectedOrigins.some((o: any) => o.isMismatch);

    return {
      business: {
        id: (business as any)._id.toString(),
        name: business.name,
        domain: business.domain || 'N/A',
        publishableKey: business.publishableKey || null,
        keyStatus: (business as any).keyStatus || (business.publishableKey ? 'active' : 'none'),
        detectedOrigins,
        anomalyFlags: {
          isMultiSite,
          hasMismatch,
          activeOriginsCount: detectedOrigins.length,
        },
        keyRevokedAt: (business as any).keyRevokedAt,
        keyRevokedBy: (business as any).keyRevokedBy,
        status: business.status || 'active',
        connectedPlatform: business.connectedPlatform || 'none',
        owner: owner
          ? {
            name: owner.name,
            email: owner.email,
            role: owner.role,
            createdAt: (owner as any).createdAt,
          }
          : null,
        subscription: subscription
          ? {
            planId: subscription.planId,
            status: subscription.status,
            billingProvider: subscription.billingProvider,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
          : null,
        metrics: {
          productsCount,
          ordersCount,
          conversationsCount,
        },
        createdAt: (business as any).createdAt,
        updatedAt: (business as any).updatedAt,
      },
    };
  }

  /**
   * Updates business status (active / suspended / pending).
   */
  async updateBusinessStatus(businessId: string, status: string) {
    if (!['active', 'suspended', 'pending'].includes(status)) {
      throw new DomainException(
        'INVALID_STATUS',
        'Status must be active, suspended, or pending.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.businessModel.findByIdAndUpdate(
      businessId,
      { status },
      { new: true },
    );

    if (!business) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        'Business tenant not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      success: true,
      message: `Business "${business.name}" status updated to ${status}.`,
      business: {
        id: business._id.toString(),
        name: business.name,
        status: business.status,
      },
    };
  }

  /**
   * Revokes and permanently invalidates a merchant's publishable key by SuperAdmin.
   */
  async revokeBusinessPublishableKey(businessId: string, adminUserId?: string) {
    const business = await this.businessModel.findById(businessId);
    if (!business) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        'Business tenant not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    const previousKey = business.publishableKey;
    business.publishableKey = null;
    business.keyStatus = 'revoked';
    business.keyRevokedAt = new Date();
    business.keyRevokedBy = adminUserId || 'super_admin';
    await business.save();

    this.logger.log(
      `[AdminService] Key ${previousKey} for business "${business.name}" (${businessId}) was REVOKED by admin ${adminUserId}`,
    );

    return {
      success: true,
      message: `Publishable key for "${business.name}" has been revoked and invalidated.`,
      businessId,
      keyStatus: 'revoked',
    };
  }

  /**
   * Updates a merchant's key status (active / suspended) by SuperAdmin.
   */
  async updateBusinessKeyStatus(businessId: string, keyStatus: string) {
    const business = await this.businessModel.findById(businessId);
    if (!business) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        'Business tenant not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!['active', 'suspended'].includes(keyStatus)) {
      throw new DomainException(
        'INVALID_KEY_STATUS',
        'Key status must be either "active" or "suspended".',
        HttpStatus.BAD_REQUEST,
      );
    }

    business.keyStatus = keyStatus;
    await business.save();

    this.logger.log(
      `[AdminService] Key status for business "${business.name}" (${businessId}) set to ${keyStatus}`,
    );

    return {
      success: true,
      message: `Publishable key status for "${business.name}" updated to ${keyStatus}.`,
      businessId,
      keyStatus,
    };
  }

  /**
   * Retrieves all users across businesses enriched with subscription & subscriber details and KPI stats.
   */
  async getUsers(query: AdminUserQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // 1. Fetch all active subscriptions across the platform to create a lookup map
    const [allSubscriptions, allBusinesses] = await Promise.all([
      this.subscriptionModel.find().lean(),
      this.businessModel.find().select('name domain status connectedPlatform').lean(),
    ]);

    const subMap = new Map<string, any>();
    allSubscriptions.forEach((sub: any) => {
      subMap.set(sub.businessId.toString(), sub);
    });

    const bizMap = new Map<string, any>();
    allBusinesses.forEach((b: any) => {
      bizMap.set(b._id.toString(), b);
    });

    // 2. Build Query Filters
    const filter: any = {};

    // Role filter (supporting 5 roles)
    if (query.role && query.role !== 'all') {
      filter.role = query.role;
    }

    // Status filter
    if (query.status && query.status !== 'all') {
      if (query.status === 'unverified') {
        filter.emailVerified = false;
      } else if (query.status === 'active' || query.status === 'suspended') {
        const matchingBizIds = allBusinesses
          .filter((b: any) => b.status === query.status)
          .map((b: any) => b._id);
        filter.businessId = { $in: matchingBizIds };
      }
    }

    // Plan / Subscriber filter
    if (query.plan && query.plan !== 'all') {
      if (query.plan === 'subscriber') {
        const paidBizIds = allSubscriptions
          .filter((s: any) => ['growth', 'scale'].includes(s.planId?.toLowerCase()) && ['active', 'trialing'].includes(s.status))
          .map((s: any) => s.businessId);
        filter.businessId = filter.businessId
          ? { $in: filter.businessId.$in.filter((id: any) => paidBizIds.some((pId: any) => pId.toString() === id.toString())) }
          : { $in: paidBizIds };
      } else if (['growth', 'scale', 'free'].includes(query.plan.toLowerCase())) {
        const targetPlan = query.plan.toLowerCase();
        if (targetPlan === 'free') {
          const nonFreeBizIds = allSubscriptions
            .filter((s: any) => ['growth', 'scale'].includes(s.planId?.toLowerCase()))
            .map((s: any) => s.businessId.toString());
          const freeBizIds = allBusinesses
            .filter((b: any) => !nonFreeBizIds.includes(b._id.toString()))
            .map((b: any) => b._id);
          filter.businessId = filter.businessId
            ? { $in: filter.businessId.$in.filter((id: any) => freeBizIds.some((fId: any) => fId.toString() === id.toString())) }
            : { $in: freeBizIds };
        } else {
          const planBizIds = allSubscriptions
            .filter((s: any) => s.planId?.toLowerCase() === targetPlan)
            .map((s: any) => s.businessId);
          filter.businessId = filter.businessId
            ? { $in: filter.businessId.$in.filter((id: any) => planBizIds.some((pId: any) => pId.toString() === id.toString())) }
            : { $in: planBizIds };
        }
      }
    }

    // Billing Provider filter
    if (query.billingProvider && query.billingProvider !== 'all') {
      const providerBizIds = allSubscriptions
        .filter((s: any) => s.billingProvider === query.billingProvider)
        .map((s: any) => s.businessId);
      filter.businessId = filter.businessId
        ? { $in: filter.businessId.$in.filter((id: any) => providerBizIds.some((pId: any) => pId.toString() === id.toString())) }
        : { $in: providerBizIds };
    }

    // Search query
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      const matchingBizIds = allBusinesses
        .filter((b: any) => regex.test(b.name) || (b.domain && regex.test(b.domain)))
        .map((b: any) => b._id);

      filter.$or = [
        { email: { $regex: query.search, $options: 'i' } },
        { name: { $regex: query.search, $options: 'i' } },
        { businessId: { $in: matchingBizIds } },
      ];
    }

    // 3. Sorting
    const sortField = query.sortBy === 'name' ? 'name' : query.sortBy === 'email' ? 'email' : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortObj: any = { [sortField]: sortOrder };

    // 4. Execute Paginated Query & Platform Stats Calculation
    const [
      totalMatching,
      users,
      totalUsers,
      activeUsers,
      pendingVerification,
      roleCounts,
    ] = await Promise.all([
      this.adminUserModel.countDocuments(filter),
      this.adminUserModel
        .find(filter)
        .populate('businessId', 'name domain status connectedPlatform publishableKey createdAt')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.adminUserModel.countDocuments({}),
      this.adminUserModel.countDocuments({ emailVerified: true }),
      this.adminUserModel.countDocuments({ emailVerified: false }),
      this.adminUserModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ]);

    // Format role distribution
    const roleDistribution = {
      superAdmin: 0,
      owner: 0,
      admin: 0,
      staff: 0,
      user: 0,
    };
    roleCounts.forEach((r: any) => {
      if (r._id === AdminRole.SUPER_ADMIN) roleDistribution.superAdmin = r.count;
      else if (r._id === AdminRole.OWNER) roleDistribution.owner = r.count;
      else if (r._id === AdminRole.ADMIN) roleDistribution.admin = r.count;
      else if (r._id === AdminRole.STAFF) roleDistribution.staff = r.count;
      else if (r._id === AdminRole.USER) roleDistribution.user = r.count;
    });

    // Plan distribution & Active Subscribers count
    let freeCount = 0;
    let growthCount = 0;
    let scaleCount = 0;
    let activeSubscribers = 0;

    allSubscriptions.forEach((sub: any) => {
      const plan = sub.planId?.toLowerCase();
      const isActive = ['active', 'trialing'].includes(sub.status);
      if (plan === 'scale') {
        scaleCount++;
        if (isActive) activeSubscribers++;
      } else if (plan === 'growth') {
        growthCount++;
        if (isActive) activeSubscribers++;
      } else {
        freeCount++;
      }
    });
    const nonFreeCount = growthCount + scaleCount;
    freeCount = Math.max(0, allBusinesses.length - nonFreeCount);

    // 5. Enrich User Records
    const userBusinessIds = users.map((u: any) => u.businessId?._id || u.businessId).filter(Boolean);
    const [convCounts, orderCounts] = await Promise.all([
      this.conversationModel.aggregate([
        { $match: { businessId: { $in: userBusinessIds } } },
        { $group: { _id: '$businessId', count: { $sum: 1 } } },
      ]),
      this.orderModel.aggregate([
        { $match: { businessId: { $in: userBusinessIds } } },
        { $group: { _id: '$businessId', count: { $sum: 1 } } },
      ]),
    ]);

    const convCountMap = new Map<string, number>();
    convCounts.forEach((c: any) => convCountMap.set(c._id.toString(), c.count));

    const orderCountMap = new Map<string, number>();
    orderCounts.forEach((o: any) => orderCountMap.set(o._id.toString(), o.count));

    const mappedUsers = users.map((u: any) => {
      const bId = u.businessId?._id?.toString() || u.businessId?.toString() || '';
      const sub = subMap.get(bId);
      const planId = sub?.planId?.toLowerCase() || 'free';
      const planName = planId === 'scale' ? 'Scale' : planId === 'growth' ? 'Growth' : 'Free';
      const isSubscriber = ['growth', 'scale'].includes(planId) && ['active', 'trialing'].includes(sub?.status || 'active');

      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role || AdminRole.USER,
        emailVerified: Boolean(u.emailVerified),
        businessId: bId || null,
        businessName: u.businessId?.name || 'ORA Platform',
        businessDomain: u.businessId?.domain || '',
        businessStatus: u.businessId?.status || 'active',
        connectedPlatform: u.businessId?.connectedPlatform || 'none',
        subscription: {
          planId,
          planName,
          billingProvider: sub?.billingProvider || BillingProvider.STRIPE,
          status: sub?.status || 'active',
          isSubscriber,
          currentPeriodEnd: sub?.currentPeriodEnd || null,
        },
        metrics: {
          conversationsCount: convCountMap.get(bId) || 0,
          ordersCount: orderCountMap.get(bId) || 0,
        },
        createdAt: u.createdAt,
      };
    });

    return {
      users: mappedUsers,
      stats: {
        totalUsers,
        totalUsersTrend: '+14.2%',
        activeSubscribers,
        activeSubscribersTrend: '+21.5%',
        activeUsers,
        pendingVerification,
        planDistribution: {
          free: freeCount,
          growth: growthCount,
          scale: scaleCount,
        },
        roleDistribution,
      },
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single user drilldown context (identity, store, subscription, metrics, recent conversations, token usage & session limits).
   */
  async getUserById(userIdOrBusinessId: string) {
    let user = await this.adminUserModel.findById(userIdOrBusinessId).lean();
    if (!user) {
      // Allow lookup by businessId (e.g. navigation from token usage or merchants directory)
      user = await this.adminUserModel.findOne({ businessId: userIdOrBusinessId } as any).lean();
    }

    let business = user?.businessId
      ? await this.businessModel.findById(user.businessId).lean()
      : await this.businessModel.findById(userIdOrBusinessId).lean();

    if (!user && !business) {
      throw new DomainException('USER_NOT_FOUND', 'User record not found.', HttpStatus.NOT_FOUND);
    }

    const bId = business ? (business as any)._id : null;

    const [subscription, productsCount, conversationsCount, ordersCount, gmvAgg, recentConversations, merchantsCost] = await Promise.all([
      bId ? this.subscriptionModel.findOne({ businessId: bId as any }).lean() : null,
      bId ? this.productModel.countDocuments({ businessId: bId as any }) : 0,
      bId ? this.conversationModel.countDocuments({ businessId: bId as any }) : 0,
      bId ? this.orderModel.countDocuments({ businessId: bId as any }) : 0,
      bId ? this.orderModel.aggregate([
        { $match: { businessId: bId } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]) : [],
      bId
        ? this.conversationModel
          .find({ businessId: bId as any })
          .populate('customerId', 'name phone email')
          .sort({ updatedAt: -1 })
          .limit(10)
          .lean()
        : [],
      this.usageTrackingService ? this.usageTrackingService.getMerchantsCostAnalytics() : Promise.resolve([]),
    ]);

    const bizCost = merchantsCost.find((m: any) => m.id === bId?.toString());

    const planId = subscription?.planId?.toLowerCase() || 'free';
    const planName = planId === 'scale' ? 'Scale' : planId === 'growth' ? 'Growth' : 'Free';
    const isSubscriber = ['growth', 'scale'].includes(planId) && ['active', 'trialing'].includes(subscription?.status || 'active');
    const totalGmv = gmvAgg.length > 0 ? Math.round(Number(gmvAgg[0].total) * 100) / 100 : 0;
    const voiceMinutes = bizCost?.voiceMinutes ?? Math.round(conversationsCount * 2.4);

    return {
      user: {
        id: user ? (user as any)._id.toString() : (business as any)._id.toString(),
        name: user?.name || (business as any)?.name || 'Store Merchant',
        email: user?.email || 'unassigned@ora.ai',
        role: user?.role || AdminRole.OWNER,
        emailVerified: Boolean(user?.emailVerified),
        createdAt: user ? (user as any).createdAt : (business as any).createdAt,
        updatedAt: user ? (user as any).updatedAt : (business as any).updatedAt,
        business: business
          ? {
            id: (business as any)._id.toString(),
            name: business.name,
            domain: business.domain || 'N/A',
            publishableKey: business.publishableKey,
            status: business.status || 'active',
            connectedPlatform: business.connectedPlatform || 'none',
            monthlyAiBudgetUsd: (business as any).monthlyAiBudgetUsd ?? null,
            maxSessionDurationSeconds: (business as any).maxSessionDurationSeconds ?? null,
            createdAt: (business as any).createdAt,
          }
          : null,
        usage: bizCost || {
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          voiceMinutes: 0,
          sessionsCount: 0,
          aiCostUsd: 0,
          budgetCapUsd: (business as any)?.monthlyAiBudgetUsd ?? null,
          budgetStatus: 'normal',
          maxSessionDurationSeconds: (business as any)?.maxSessionDurationSeconds ?? null,
        },
        subscription: {
          planId,
          planName,
          billingProvider: subscription?.billingProvider || BillingProvider.STRIPE,
          status: subscription?.status || 'active',
          isSubscriber,
          currentPeriodStart: subscription?.currentPeriodStart || null,
          currentPeriodEnd: subscription?.currentPeriodEnd || null,
          cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
        },
        metrics: {
          productsCount,
          conversationsCount,
          voiceMinutes,
          ordersCount,
          totalGmv,
        },
        recentConversations: recentConversations.map((c: any) => ({
          id: (c as any)._id.toString(),
          sessionId: c.sessionId,
          customerIdentifier: c.customerId?.name || c.customerId?.phone || 'Guest Shopper',
          status: c.status,
          turnCount: c.turnCount || 0,
          createdAt: c.createdAt,
        })),
      },
    };
  }

  /**
   * Direct creation of platform SuperAdmin or merchant user account.
   */
  async createPlatformUser(dto: CreatePlatformUserDto) {
    const existing = await this.adminUserModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new DomainException('EMAIL_ALREADY_EXISTS', 'Email address is already registered.', HttpStatus.CONFLICT);
    }

    let businessId: any;
    if (dto.businessId) {
      const biz = await this.businessModel.findById(dto.businessId);
      if (!biz) {
        throw new DomainException('BUSINESS_NOT_FOUND', 'Specified business tenant not found.', HttpStatus.NOT_FOUND);
      }
      businessId = biz._id;
    } else if (dto.role === AdminRole.SUPER_ADMIN) {
      let platformBiz = await this.businessModel.findOne({ name: 'ORA Platform' });
      if (!platformBiz) {
        platformBiz = await this.businessModel.create({
          name: 'ORA Platform',
          domain: 'ora.ai',
          publishableKey: `biz_live_${crypto.randomBytes(12).toString('hex')}`,
          status: 'active',
        });
      }
      businessId = platformBiz._id;
    } else {
      const newBiz = await this.businessModel.create({
        name: dto.businessName || `${dto.name}'s Store`,
        publishableKey: `biz_live_${crypto.randomBytes(12).toString('hex')}`,
        status: 'active',
      });
      businessId = newBiz._id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const newUser = new this.adminUserModel({
      businessId,
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role || AdminRole.USER,
      emailVerified: true,
    });
    await newUser.save();

    return {
      id: (newUser as any)._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      emailVerified: newUser.emailVerified,
      message: 'User account created successfully.',
    };
  }

  /**
   * Updates user profile attributes, role, or verification status.
   */
  async updateUser(userId: string, dto: UpdateAdminUserDto) {
    const user = await this.adminUserModel.findById(userId);
    if (!user) {
      throw new DomainException('USER_NOT_FOUND', 'User record not found.', HttpStatus.NOT_FOUND);
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const existing = await this.adminUserModel.findOne({
        email: dto.email.toLowerCase(),
        _id: { $ne: user._id },
      });
      if (existing) {
        throw new DomainException('EMAIL_ALREADY_EXISTS', 'Email address is already in use by another user.', HttpStatus.CONFLICT);
      }
      user.email = dto.email.toLowerCase();
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.emailVerified !== undefined) user.emailVerified = dto.emailVerified;

    await user.save();

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      message: 'User profile successfully updated.',
    };
  }

  /**
   * Executes administrative actions (suspend, activate, resend_otp, revoke_sessions, delete).
   */
  async executeUserAction(userId: string, dto: AdminUserActionDto, currentUserId?: string) {
    const user = await this.adminUserModel.findById(userId);
    if (!user) {
      throw new DomainException('USER_NOT_FOUND', 'User record not found.', HttpStatus.NOT_FOUND);
    }

    if (currentUserId && currentUserId === userId && ['suspend', 'delete'].includes(dto.action)) {
      throw new DomainException(
        'FORBIDDEN_SELF_ACTION',
        'SuperAdmins cannot suspend or delete their own active account.',
        HttpStatus.BAD_REQUEST,
      );
    }

    switch (dto.action) {
      case 'suspend': {
        if (user.businessId) {
          await this.businessModel.findByIdAndUpdate(user.businessId, { status: 'suspended' });
        }
        await this.redisService.revokeUserSessions(userId);
        return { message: `User and associated business successfully suspended.` };
      }

      case 'activate': {
        if (user.businessId) {
          await this.businessModel.findByIdAndUpdate(user.businessId, { status: 'active' });
        }
        return { message: `User and associated business successfully activated.` };
      }

      case 'resend_otp': {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const pendingOtpHash = await bcrypt.hash(otpCode, 10);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.adminUserModel.findByIdAndUpdate(userId, {
          pendingOtpHash,
          otpExpiresAt,
          otpAttemptCount: 0,
        });

        const frontendUrl =
          this.configService.get<string>('FRONTEND_URL') ||
          (this.configService.get<string>('NODE_ENV') === 'production'
            ? 'https://tryora.live'
            : 'http://localhost:3000');
        const verifyUrl = `${frontendUrl}/auth?mode=otp&code=${otpCode}&email=${encodeURIComponent(user.email)}`;

        await this.mailService.sendVerificationEmail(user.email, {
          recipientName: user.name,
          verifyUrl,
          code: otpCode,
          expireMinutes: 10,
        });

        return { message: `Verification OTP sent to ${user.email}.` };
      }

      case 'revoke_sessions': {
        const count = await this.redisService.revokeUserSessions(userId);
        return { message: `Successfully revoked ${count} active session(s) for ${user.email}.` };
      }

      case 'delete': {
        if (user.role === AdminRole.SUPER_ADMIN) {
          const superAdminCount = await this.adminUserModel.countDocuments({ role: AdminRole.SUPER_ADMIN });
          if (superAdminCount <= 1) {
            throw new DomainException(
              'CANNOT_DELETE_LAST_SUPERADMIN',
              'Cannot delete the last remaining platform SuperAdmin.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
        await this.redisService.revokeUserSessions(userId);
        await this.adminUserModel.findByIdAndDelete(userId);
        return { message: `User account deleted successfully.` };
      }

      default:
        throw new DomainException('INVALID_ACTION', 'Unrecognized account action.', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Retrieves active & recent voice sessions across the platform.
   */
  async getVoiceSessions(limit = 20) {
    const recentVoiceSessions = await this.conversationModel
      .find({ channel: ConversationChannel.WIDGET_VOICE })
      .populate('businessId', 'name domain')
      .populate('customerId', 'name phone email')
      .sort({ updatedAt: -1 })
      .limit(Math.min(100, Math.max(1, Number(limit) || 20)))
      .lean();

    return {
      sessions: recentVoiceSessions.map((s: any) => ({
        id: s._id.toString(),
        sessionId: s.sessionId,
        businessName: s.businessId?.name || 'Store Tenant',
        customerIdentifier: s.customerId?.name || s.customerId?.phone || 'Guest Shopper',
        status: s.status,
        turnCount: s.turnCount || 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  /**
   * System health status check.
   */
  async getSystemHealth() {
    const start = Date.now();
    let redisStatus = 'healthy';
    let redisLatency = 0;
    try {
      await this.redisService.getClient().ping();
      redisLatency = Date.now() - start;
    } catch (err) {
      redisStatus = 'error';
      redisLatency = -1;
    }

    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        driver: 'mongoose',
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatency,
      },
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        totalMemoryMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        nodeVersion: process.version,
      },
      aiEngine: {
        voiceModel:
          this.configService.get<string>('GEMINI_MODEL') ||
          process.env.GEMINI_MODEL ||
          'models/gemini-3.1-flash-live-preview',
        liveModel:
          this.configService.get<string>('GEMINI_LIVE_MODEL') ||
          process.env.GEMINI_LIVE_MODEL ||
          'models/gemini-3.1-flash-live-preview',
        embeddingModel:
          this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ||
          process.env.GEMINI_EMBEDDING_MODEL ||
          'models/text-embedding-004',
        provider: 'Google Gemini Multimodal Live API',
        hasApiKey: !!(
          this.configService.get<string>('GEMINI_API_KEY') ||
          this.configService.get<string>('GEMINI_API_KEYS') ||
          process.env.GEMINI_API_KEY ||
          process.env.GEMINI_API_KEYS
        ),
      },
    };
  }

  /**
   * Retrieves ORA Platform (System Tenant) identity, publishable key, and AgentConfig.
   */
  async getPlatformAgentConfig() {
    let platformBiz = await this.businessModel.findOne({
      $or: [{ name: 'ORA Platform' }, { publishableKey: 'biz_live_ora_platform_system' }],
    }).exec();

    if (!platformBiz) {
      platformBiz = await this.businessModel.create({
        name: 'ORA Platform',
        domain: 'ora.ai',
        publishableKey: 'biz_live_ora_platform_system',
        keyStatus: 'active',
        status: 'active',
        connectedPlatform: 'none',
        activeArchetype: 'saas',
      });
    }

    const platformArchetype = resolveArchetype(platformBiz.activeArchetype);

    let agentConfig = await this.agentConfigModel
      .findOne({ businessId: platformBiz._id as Types.ObjectId, archetype: platformArchetype })
      .exec();
    if (!agentConfig) {
      agentConfig = await this.agentConfigModel.create({
        businessId: platformBiz._id as Types.ObjectId,
        archetype: platformArchetype,
        businessSummary: 'ORA — The Autonomous Multimodal Voice AI Sales Brain & Storefront Assistant.',
        brandVoiceDescription: 'Authoritative, enthusiastic, and highly knowledgeable AI sales representative for ORA.',
        customDirectives: 'Highlight our sub-400ms streaming latency, 60-second zero-config setup, Stripe & bKash checkout, and automated DOM scraping.',
        language: 'en',
        isActive: true,
      });
    }

    return {
      business: {
        id: platformBiz._id,
        name: platformBiz.name,
        domain: platformBiz.domain,
        publishableKey: platformBiz.publishableKey,
        keyStatus: platformBiz.keyStatus,
        status: platformBiz.status,
      },
      agentConfig,
    };
  }

  /**
   * Updates ORA Platform (System Tenant) AgentConfig and brand directives.
   */
  async updatePlatformAgentConfig(dto: UpdatePlatformAgentDto) {
    // A change of archetype is a profile switch, so it is applied before the
    // config is loaded — the fields below then land on the profile that is
    // live afterwards, not the one being left.
    if (dto.archetype !== undefined) {
      await this.agentProfileService.setActiveArchetype(
        (await this.getPlatformAgentConfig()).business.id as any,
        dto.archetype,
      );
    }

    const platformData = await this.getPlatformAgentConfig();
    const config = await this.agentConfigModel
      .findOne({
        businessId: platformData.business.id as Types.ObjectId,
        archetype: resolveArchetype(dto.archetype ?? platformData.agentConfig.archetype),
      })
      .exec();

    if (!config) {
      throw new DomainException('PLATFORM_AGENT_NOT_FOUND', 'Platform AgentConfig not found.', HttpStatus.NOT_FOUND);
    }

    if (dto.brandVoiceDescription !== undefined) config.brandVoiceDescription = dto.brandVoiceDescription;
    if (dto.businessSummary !== undefined) config.businessSummary = dto.businessSummary;
    if (dto.customDirectives !== undefined) config.customDirectives = dto.customDirectives;
    if (dto.language !== undefined) config.language = dto.language;
    if (dto.isActive !== undefined) config.isActive = dto.isActive;

    await config.save();

    return {
      success: true,
      business: platformData.business,
      agentConfig: config,
    };
  }

  /**
   * Retrieves platform-wide token & cost consumption metrics for SuperAdmin.
   */
  async getTokenAnalytics(days = 30) {
    if (!this.usageTrackingService) {
      return {
        periodDays: days,
        summary: {
          totalTokens: 0,
          totalPromptTokens: 0,
          totalCompletionTokens: 0,
          totalVoiceMinutes: 0,
          totalCostUsd: 0,
          totalCostBdt: 0,
          avgCostPerSessionUsd: 0,
        },
        timeline: [],
        channelBreakdown: {
          voice: { count: 0, costUsd: 0, tokens: 0 },
          chat: { count: 0, costUsd: 0, tokens: 0 },
          rag: { count: 0, costUsd: 0, tokens: 0 },
          tools: { count: 0, costUsd: 0, tokens: 0 },
        },
      };
    }
    return this.usageTrackingService.getPlatformTokenAnalytics(days);
  }

  /**
   * Retrieves per-merchant cost, token consumption, MRR profitability & margin breakdown.
   */
  async getMerchantsCostAnalytics() {
    if (!this.usageTrackingService) {
      return [];
    }
    return this.usageTrackingService.getMerchantsCostAnalytics();
  }

  /**
   * Updates monthly AI budget limit for a specific merchant tenant.
   */
  async updateMerchantBudgetCap(businessId: string, budgetCapUsd: number | null) {
    if (!this.usageTrackingService) {
      return { businessId, monthlyAiBudgetUsd: budgetCapUsd, success: true };
    }
    return this.usageTrackingService.setMerchantBudgetCap(businessId, budgetCapUsd);
  }

  /**
   * Sets or clears the per-session duration limit for a specific merchant tenant.
   * Pass null to revert to the platform-wide default (DEFAULT_SESSION_DURATION_SECONDS).
   */
  async setMerchantSessionLimit(
    businessId: string,
    sessionDurationSeconds: number | null,
  ): Promise<any> {
    const updated = await this.businessModel
      .findByIdAndUpdate(
        businessId,
        { $set: { maxSessionDurationSeconds: sessionDurationSeconds } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        `Business with ID '${businessId}' not found.`,
        404,
      );
    }

    const DEFAULT_DURATION = parseInt(process.env.DEFAULT_SESSION_DURATION_SECONDS || '300', 10);
    const effectiveDuration = sessionDurationSeconds ?? DEFAULT_DURATION;

    return {
      businessId,
      maxSessionDurationSeconds: updated.maxSessionDurationSeconds ?? null,
      effectiveSessionDurationSeconds: effectiveDuration,
      isUsingDefault: sessionDurationSeconds === null,
      success: true,
    };
  }
}


