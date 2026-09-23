import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AgentProfileService } from '../common/agent-profile/agent-profile.service';
import { Business } from '../users/schemas/business.schema';
import { AdminUser } from '../users/schemas/admin-user.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { Subscription } from '../billing/schemas/subscription.schema';
import { Order } from '../orders/schemas/order.schema';
import { Product } from '../products/schemas/product.schema';
import { AgentConfig } from '../agent-config/schemas/agent-config.schema';
import { Plan } from '../billing/schemas/plan.schema';
import { TrialLog } from '../billing/schemas/trial-log.schema';
import { DailyUsageSummary } from '../usage/schemas/daily-usage-summary.schema';
import { RedisService } from '../common/redis/redis.service';
import { MailService } from '../mail/mail.service';
import { UsageTrackingService } from '../usage/usage-tracking.service';

/**
 * The overview used to hardcode tier prices, invent a plan distribution when none
 * existed, estimate voice minutes at 2.4 per conversation, and report fixed growth
 * percentages. Every figure below has to come from stored data instead.
 */
describe('AdminService.getPlatformStats', () => {
  let service: AdminService;

  const plans = [
    { planId: 'free', name: 'Free Tier', priceUsdCents: 0, priceBdtPaisa: 0, isActive: false },
    { planId: 'starter', name: 'Starter Plan', priceUsdCents: 2900, priceBdtPaisa: 320000, isActive: true },
    { planId: 'growth', name: 'Growth Plan', priceUsdCents: 7900, priceBdtPaisa: 850000, isActive: true },
    { planId: 'scale', name: 'Scale Plan', priceUsdCents: 19900, priceBdtPaisa: 2200000, isActive: true },
  ];

  const activeSubs = [
    { planId: 'growth' },
    { planId: 'growth' },
    { planId: 'starter' },
    { planId: 'starter' },
  ];

  const countingModel = (count = 0) => ({
    countDocuments: jest.fn().mockResolvedValue(count),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
      lean: jest.fn().mockResolvedValue([]),
    }),
    aggregate: jest.fn().mockResolvedValue([]),
    db: { readyState: 1 },
  });

  const build = async (overrides: {
    subs?: any[];
    audioSeconds?: number;
    previousAudioSeconds?: number;
    previousSubs?: any[];
  } = {}): Promise<TestingModule> => {
    const businessModel = countingModel(3);
    const subscriptionModel = {
      ...countingModel(),
      find: jest.fn().mockImplementation((filter: any) => ({
        lean: jest.fn().mockResolvedValue(
          filter?.createdAt ? (overrides.previousSubs ?? []) : (overrides.subs ?? activeSubs),
        ),
      })),
    };

    const dailyUsageModel = {
      aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
        const match = pipeline[0]?.$match?.date;
        // The window before this one carries an upper bound; the current one does not.
        if (match?.$lt) {
          return Promise.resolve([{ _id: null, audioSeconds: overrides.previousAudioSeconds ?? 0 }]);
        }
        if (match?.$gte) {
          return Promise.resolve([
            { _id: '2026-09-22', audioSeconds: overrides.audioSeconds ?? 0, sessions: 4 },
          ]);
        }
        return Promise.resolve([{ _id: null, audioSeconds: overrides.audioSeconds ?? 0 }]);
      }),
    };

    return Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AgentProfileService, useValue: {} },
        { provide: getModelToken(Business.name), useValue: businessModel },
        { provide: getModelToken(AdminUser.name), useValue: countingModel(5) },
        { provide: getModelToken(Conversation.name), useValue: countingModel(112) },
        { provide: getModelToken(Customer.name), useValue: countingModel(9) },
        { provide: getModelToken(Subscription.name), useValue: subscriptionModel },
        { provide: getModelToken(Order.name), useValue: countingModel(2) },
        { provide: getModelToken(Product.name), useValue: countingModel(40) },
        { provide: getModelToken(AgentConfig.name), useValue: countingModel() },
        {
          provide: getModelToken(Plan.name),
          useValue: { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(plans) }) },
        },
        { provide: getModelToken(TrialLog.name), useValue: countingModel() },
        { provide: getModelToken(DailyUsageSummary.name), useValue: dailyUsageModel },
        {
          provide: RedisService,
          useValue: { getClient: jest.fn().mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') }) },
        },
        { provide: MailService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: UsageTrackingService, useValue: {} },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await build();
    service = module.get<AdminService>(AdminService);
    // onModuleInit seeds a super admin; the stats path is what is under test.
    jest.spyOn(service as any, 'seedSuperAdminOnStartup').mockResolvedValue(undefined);
  });

  it('prices MRR from the plan catalogue, not from hardcoded tiers', async () => {
    const stats = await service.getPlatformStats('30d');

    // 2 x $79 growth + 2 x $29 starter. The old code read $49 for growth and counted
    // starter as free, reporting $98.
    expect(stats.overview.platformMRR).toBe(216);
    expect(stats.overview.platformARR).toBe(2592);
  });

  it('counts every tier that exists, including starter', async () => {
    const stats = await service.getPlatformStats('30d');

    expect(stats.overview.planDistribution).toEqual({ growth: 2, starter: 2 });
    expect(stats.overview.planCatalogue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ planId: 'starter', priceUsd: 29, subscribers: 2 }),
        expect.objectContaining({ planId: 'growth', priceUsd: 79, subscribers: 2 }),
        expect.objectContaining({ planId: 'scale', priceUsd: 199, subscribers: 0 }),
      ]),
    );
    // A deactivated tier is not offered, so it is not listed.
    expect(stats.overview.planCatalogue.map((p: any) => p.planId)).not.toContain('free');
  });

  it('reports zeros for an empty platform instead of inventing a distribution', async () => {
    const module = await build({ subs: [] });
    const emptyService = module.get<AdminService>(AdminService);

    const stats = await emptyService.getPlatformStats('30d');

    expect(stats.overview.platformMRR).toBe(0);
    expect(stats.overview.planDistribution).toEqual({});
  });

  it('reports voice minutes from recorded audio, not an assumed average', async () => {
    const module = await build({ audioSeconds: 6900 });
    const audioService = module.get<AdminService>(AdminService);

    const stats = await audioService.getPlatformStats('30d');

    // 6900s = 115 minutes. The old estimate was conversations x 2.4 = 269.
    expect(stats.overview.totalVoiceMinutes).toBe(115);
  });

  it('computes the voice trend against the previous window', async () => {
    const module = await build({ audioSeconds: 6000, previousAudioSeconds: 3000 });
    const trendService = module.get<AdminService>(AdminService);

    const stats = await trendService.getPlatformStats('30d');

    expect(stats.overview.growth.voiceTrend).toBe('+100%');
    expect(stats.overview.growth.comparedToDays).toBe(30);
  });

  it('reports an unmeasurable trend as null rather than a flattering constant', async () => {
    const stats = await service.getPlatformStats('30d');

    expect(stats.overview.growth.mrrTrend).toBeNull();
    expect(stats.overview.growth.voiceTrend).toBeNull();
  });

  it('reports the real Mongo connection state', async () => {
    const stats = await service.getPlatformStats('30d');

    expect(stats.system.mongoStatus).toBe('connected');
  });
});
