import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TokenUsageRecord,
  TokenUsageRecordDocument,
  UsageChannelType,
} from './schemas/token-usage-record.schema';
import {
  DailyUsageSummary,
  DailyUsageSummaryDocument,
} from './schemas/daily-usage-summary.schema';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { Subscription, SubscriptionDocument } from '../billing/schemas/subscription.schema';
import { Plan, PlanDocument } from '../billing/schemas/plan.schema';
import { CostCalculatorService, UsageMetricsPayload } from './cost-calculator.service';
import { RedisService } from '../common/redis/redis.service';

export interface RecordUsageDto extends UsageMetricsPayload {
  businessId: string | Types.ObjectId;
  sessionId: string;
  channelType?: UsageChannelType;
  model?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(
    @InjectModel(TokenUsageRecord.name)
    private readonly tokenUsageModel: Model<TokenUsageRecordDocument>,
    @InjectModel(DailyUsageSummary.name)
    private readonly dailySummaryModel: Model<DailyUsageSummaryDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
    private readonly costCalculator: CostCalculatorService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Records a turn or session usage telemetry point asynchronously.
   * Updates Redis hot counters, persists granular record, and upserts daily summary.
   */
  async recordUsage(dto: RecordUsageDto): Promise<void> {
    try {
      const bizIdStr = dto.businessId.toString();
      const bId = new Types.ObjectId(bizIdStr);
      const promptTokens = dto.promptTokens || 0;
      const completionTokens = dto.completionTokens || 0;
      const cachedTokens = dto.cachedTokens || 0;
      const audioInputSecs = Math.round((dto.audioInputSeconds || 0) * 100) / 100;
      const audioOutputSecs = Math.round((dto.audioOutputSeconds || 0) * 100) / 100;
      const channelType = dto.channelType || UsageChannelType.VOICE_STREAM;
      const model = dto.model || 'gemini-2.0-flash';

      // 1. Calculate financial cost breakdown
      const cost = this.costCalculator.calculateCost({
        promptTokens,
        completionTokens,
        cachedTokens,
        audioInputSeconds: audioInputSecs,
        audioOutputSeconds: audioOutputSecs,
        model,
      });

      const todayStr = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
      const currentMonth = todayStr.substring(0, 7); // YYYY-MM

      // 2. Atomic updates to Redis hot counters
      const redis = this.redisService.getClient();
      const pipeline = redis.pipeline();

      // Tenant monthly counters
      if (promptTokens > 0) pipeline.incrby(`usage:${bizIdStr}:${currentMonth}:promptTokens`, promptTokens);
      if (completionTokens > 0) pipeline.incrby(`usage:${bizIdStr}:${currentMonth}:completionTokens`, completionTokens);
      if (audioInputSecs + audioOutputSecs > 0) {
        pipeline.incrby(
          `usage:${bizIdStr}:${currentMonth}:audioSeconds`,
          Math.round(audioInputSecs + audioOutputSecs),
        );
      }
      pipeline.incrbyfloat(`usage:${bizIdStr}:${currentMonth}:costUsd`, cost.totalCostUsd);

      // Global platform monthly counters
      if (promptTokens > 0) pipeline.incrby(`platform_usage:${currentMonth}:promptTokens`, promptTokens);
      if (completionTokens > 0) pipeline.incrby(`platform_usage:${currentMonth}:completionTokens`, completionTokens);
      pipeline.incrbyfloat(`platform_usage:${currentMonth}:costUsd`, cost.totalCostUsd);

      await pipeline.exec().catch((err) => {
        this.logger.warn(`[UsageTracking] Redis pipeline execution notice: ${err?.message}`);
      });

      // 3. Persist granular token record in MongoDB
      await this.tokenUsageModel.create({
        businessId: bId,
        sessionId: dto.sessionId,
        channelType,
        aiModel: model,
        promptTokens,
        completionTokens,
        cachedTokens,
        audioInputSeconds: audioInputSecs,
        audioOutputSeconds: audioOutputSecs,
        estimatedCostUsd: cost.totalCostUsd,
        metadata: dto.metadata || {},
      });

      // 4. Upsert aggregated daily summary
      await this.dailySummaryModel.updateOne(
        { businessId: bId, date: todayStr },
        {
          $inc: {
            promptTokens,
            completionTokens,
            cachedTokens,
            audioInputSeconds: audioInputSecs,
            audioOutputSeconds: audioOutputSecs,
            sessionsCount: 1,
            totalCostUsd: cost.totalCostUsd,
          },
        },
        { upsert: true },
      );
    } catch (err: any) {
      this.logger.error(`[UsageTracking] Failed to record usage: ${err.message}`, err.stack);
    }
  }

  /**
   * Retrieves high-level platform-wide token & cost analytics for the SuperAdmin Command Center.
   */
  async getPlatformTokenAnalytics(days = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().substring(0, 10);

    // Aggregate daily summaries for the past N days
    const dailySummaries = await this.dailySummaryModel
      .aggregate([
        { $match: { date: { $gte: startDateStr } } },
        {
          $group: {
            _id: '$date',
            promptTokens: { $sum: '$promptTokens' },
            completionTokens: { $sum: '$completionTokens' },
            cachedTokens: { $sum: '$cachedTokens' },
            audioInputSeconds: { $sum: '$audioInputSeconds' },
            audioOutputSeconds: { $sum: '$audioOutputSeconds' },
            sessionsCount: { $sum: '$sessionsCount' },
            totalCostUsd: { $sum: '$totalCostUsd' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    // Map time series points
    const timeline = dailySummaries.map((s) => ({
      date: s._id,
      promptTokens: s.promptTokens || 0,
      completionTokens: s.completionTokens || 0,
      totalTokens: (s.promptTokens || 0) + (s.completionTokens || 0),
      voiceMinutes: Math.round(((s.audioInputSeconds || 0) + (s.audioOutputSeconds || 0)) / 60 * 10) / 10,
      costUsd: Math.round((s.totalCostUsd || 0) * 1000) / 1000,
      sessions: s.sessionsCount || 0,
    }));

    // Calculate aggregate totals
    const totalPromptTokens = timeline.reduce((acc, t) => acc + t.promptTokens, 0);
    const totalCompletionTokens = timeline.reduce((acc, t) => acc + t.completionTokens, 0);
    const totalTokens = totalPromptTokens + totalCompletionTokens;
    const totalVoiceMinutes = timeline.reduce((acc, t) => acc + t.voiceMinutes, 0);
    const totalCostUsd = Math.round(timeline.reduce((acc, t) => acc + t.costUsd, 0) * 100) / 100;
    const totalCostBdt = Math.round(totalCostUsd * 122);

    // Channel type breakdown from granular records
    const channelAgg = await this.tokenUsageModel
      .aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$channelType',
            count: { $sum: 1 },
            costUsd: { $sum: '$estimatedCostUsd' },
            tokens: { $sum: { $add: ['$promptTokens', '$completionTokens'] } },
          },
        },
      ])
      .exec();

    const channelBreakdown = {
      voice: { count: 0, costUsd: 0, tokens: 0 },
      chat: { count: 0, costUsd: 0, tokens: 0 },
      rag: { count: 0, costUsd: 0, tokens: 0 },
      tools: { count: 0, costUsd: 0, tokens: 0 },
    };

    channelAgg.forEach((item) => {
      const type = item._id;
      if (type === UsageChannelType.VOICE_STREAM) {
        channelBreakdown.voice = {
          count: item.count,
          costUsd: Math.round(item.costUsd * 1000) / 1000,
          tokens: item.tokens,
        };
      } else if (type === UsageChannelType.CHAT_TURN) {
        channelBreakdown.chat = {
          count: item.count,
          costUsd: Math.round(item.costUsd * 1000) / 1000,
          tokens: item.tokens,
        };
      } else if (type === UsageChannelType.RAG_EMBEDDING) {
        channelBreakdown.rag = {
          count: item.count,
          costUsd: Math.round(item.costUsd * 1000) / 1000,
          tokens: item.tokens,
        };
      } else if (type === UsageChannelType.TOOL_EXECUTION) {
        channelBreakdown.tools = {
          count: item.count,
          costUsd: Math.round(item.costUsd * 1000) / 1000,
          tokens: item.tokens,
        };
      }
    });

    return {
      periodDays: days,
      activeModel: {
        voiceModel:
          process.env.GEMINI_MODEL ||
          process.env.GEMINI_LIVE_MODEL ||
          'models/gemini-3.1-flash-live-preview',
        embeddingModel:
          process.env.GEMINI_EMBEDDING_MODEL ||
          'models/text-embedding-004',
      },
      summary: {
        totalTokens,
        totalPromptTokens,
        totalCompletionTokens,
        totalVoiceMinutes: Math.round(totalVoiceMinutes),
        totalCostUsd,
        totalCostBdt,
        avgCostPerSessionUsd:
          timeline.reduce((acc, t) => acc + t.sessions, 0) > 0
            ? Math.round(
                (totalCostUsd / timeline.reduce((acc, t) => acc + t.sessions, 0)) * 10000,
              ) / 10000
            : 0,
      },
      timeline,
      channelBreakdown,
    };
  }

  /**
   * Retrieves per-merchant cost, usage, gross margin, and budget cap status.
   */
  async getMerchantsCostAnalytics(): Promise<any[]> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Fetch all active businesses
    const businesses = await this.businessModel
      .find({})
      .select('_id name domain status connectedPlatform monthlyAiBudgetUsd maxSessionDurationSeconds createdAt')
      .lean()
      .exec();

    // Fetch subscriptions & plans
    const subscriptions = await this.subscriptionModel.find({}).lean().exec();
    const plans = await this.planModel.find({}).lean().exec();

    const planMap = new Map<string, any>();
    plans.forEach((p) => planMap.set(p.planId, p));

    const subMap = new Map<string, any>();
    subscriptions.forEach((s) => subMap.set(s.businessId.toString(), s));

    // Aggregate monthly usage per business from DailyUsageSummary
    const monthlyAgg = await this.dailySummaryModel
      .aggregate([
        { $match: { date: { $gte: `${currentMonth}-01` } } },
        {
          $group: {
            _id: '$businessId',
            promptTokens: { $sum: '$promptTokens' },
            completionTokens: { $sum: '$completionTokens' },
            audioInputSeconds: { $sum: '$audioInputSeconds' },
            audioOutputSeconds: { $sum: '$audioOutputSeconds' },
            sessionsCount: { $sum: '$sessionsCount' },
            totalCostUsd: { $sum: '$totalCostUsd' },
          },
        },
      ])
      .exec();

    const usageMap = new Map<string, any>();
    monthlyAgg.forEach((u) => usageMap.set(u._id.toString(), u));

    return businesses.map((biz) => {
      const bizIdStr = biz._id.toString();
      const usage = usageMap.get(bizIdStr) || {
        promptTokens: 0,
        completionTokens: 0,
        audioInputSeconds: 0,
        audioOutputSeconds: 0,
        sessionsCount: 0,
        totalCostUsd: 0,
      };

      const sub = subMap.get(bizIdStr);
      const planId = sub ? sub.planId : 'free';
      const plan = planMap.get(planId);

      const mrrUsd = plan ? plan.priceUsdCents / 100 : 0;
      const aiCostUsd = Math.round(usage.totalCostUsd * 1000) / 1000;
      const grossProfitUsd = Math.round((mrrUsd - aiCostUsd) * 100) / 100;
      const grossMarginPercent =
        mrrUsd > 0
          ? Math.round(((mrrUsd - aiCostUsd) / mrrUsd) * 1000) / 10
          : aiCostUsd > 0
          ? -100
          : 100;

      const voiceMinutes =
        Math.round(((usage.audioInputSeconds + usage.audioOutputSeconds) / 60) * 10) / 10;
      const totalTokens = usage.promptTokens + usage.completionTokens;

      const budgetCap = biz.monthlyAiBudgetUsd ?? null;
      let budgetStatus = 'normal';
      if (budgetCap && budgetCap > 0) {
        if (aiCostUsd >= budgetCap) {
          budgetStatus = 'exceeded';
        } else if (aiCostUsd >= budgetCap * 0.8) {
          budgetStatus = 'warning';
        }
      }

      return {
        id: bizIdStr,
        name: biz.name,
        domain: biz.domain || 'N/A',
        status: biz.status,
        planId,
        planName: plan?.name || 'Free Tier',
        mrrUsd,
        totalTokens,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        voiceMinutes,
        sessionsCount: usage.sessionsCount,
        aiCostUsd,
        grossProfitUsd,
        grossMarginPercent,
        budgetCapUsd: budgetCap,
        budgetStatus,
        maxSessionDurationSeconds: (biz as any).maxSessionDurationSeconds ?? null,
      };
    });
  }

  /**
   * Sets or updates the monthly AI budget cap for a specific merchant.
   */
  async setMerchantBudgetCap(businessId: string, budgetCapUsd: number | null): Promise<any> {
    const updated = await this.businessModel
      .findByIdAndUpdate(
        businessId,
        { $set: { monthlyAiBudgetUsd: budgetCapUsd } },
        { new: true },
      )
      .exec();

    return {
      businessId,
      monthlyAiBudgetUsd: updated?.monthlyAiBudgetUsd ?? null,
      success: true,
    };
  }
}
