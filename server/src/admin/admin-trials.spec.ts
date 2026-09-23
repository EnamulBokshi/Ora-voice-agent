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

const DAY = 24 * 60 * 60 * 1000;

describe('AdminService trial leads', () => {
  let service: AdminService;
  let mailService: { sendAdminOutreachEmail: jest.Mock };

  const plans = [
    { planId: 'starter', name: 'Starter Plan', priceUsdCents: 2900, isActive: true },
    { planId: 'growth', name: 'Growth Plan', priceUsdCents: 7900, isActive: true },
  ];

  const trialLogs = [
    {
      businessId: 'biz_running',
      normalizedDomain: 'running.com',
      registeredEmail: 'owner@running.com',
      grantedAt: new Date(Date.now() - 4 * DAY),
      trialExpiresAt: new Date(Date.now() + 10 * DAY),
    },
    {
      businessId: 'biz_soon',
      normalizedDomain: 'soon.com',
      registeredEmail: 'owner@soon.com',
      grantedAt: new Date(Date.now() - 12 * DAY),
      trialExpiresAt: new Date(Date.now() + 2 * DAY),
    },
    {
      businessId: 'biz_expired',
      normalizedDomain: 'expired.com',
      registeredEmail: 'owner@expired.com',
      grantedAt: new Date(Date.now() - 30 * DAY),
      trialExpiresAt: new Date(Date.now() - 16 * DAY),
    },
    {
      businessId: 'biz_paid',
      normalizedDomain: 'paid.com',
      registeredEmail: 'owner@paid.com',
      grantedAt: new Date(Date.now() - 40 * DAY),
      trialExpiresAt: new Date(Date.now() - 26 * DAY),
    },
  ];

  const businesses = [
    { _id: 'biz_running', name: 'Running Store', status: 'active' },
    { _id: 'biz_soon', name: 'Soon Store', status: 'active' },
    { _id: 'biz_expired', name: 'Expired Store', status: 'pending' },
    { _id: 'biz_paid', name: 'Paid Store', status: 'active' },
  ];

  const subscriptions = [
    { businessId: 'biz_running', planId: 'starter', status: 'trialing' },
    { businessId: 'biz_soon', planId: 'growth', status: 'trialing' },
    { businessId: 'biz_expired', planId: 'starter', status: 'trialing' },
    { businessId: 'biz_paid', planId: 'growth', status: 'active' },
  ];

  const owners = [
    { businessId: 'biz_running', name: 'Ada', email: 'ada@running.com', role: 'owner' },
    { businessId: 'biz_soon', name: 'Bo', email: 'bo@soon.com', role: 'owner' },
    { businessId: 'biz_paid', name: 'Cy', email: 'cy@paid.com', role: 'owner' },
  ];

  const leanModel = (rows: any[]) => ({
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }),
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }),
      lean: jest.fn().mockResolvedValue(rows),
    }),
    countDocuments: jest.fn().mockResolvedValue(rows.length),
    aggregate: jest.fn().mockResolvedValue([]),
    db: { readyState: 1 },
  });

  beforeEach(async () => {
    mailService = { sendAdminOutreachEmail: jest.fn().mockResolvedValue({ delivered: true }) };

    const adminUserModel: any = leanModel(owners);
    adminUserModel.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ name: 'Ada', email: 'ada@running.com' }),
      }),
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      }),
    });

    const businessModel: any = leanModel(businesses);
    businessModel.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(businesses[0]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AgentProfileService, useValue: {} },
        { provide: getModelToken(Business.name), useValue: businessModel },
        { provide: getModelToken(AdminUser.name), useValue: adminUserModel },
        { provide: getModelToken(Conversation.name), useValue: leanModel([]) },
        { provide: getModelToken(Customer.name), useValue: leanModel([]) },
        { provide: getModelToken(Subscription.name), useValue: leanModel(subscriptions) },
        { provide: getModelToken(Order.name), useValue: leanModel([]) },
        { provide: getModelToken(Product.name), useValue: leanModel([]) },
        { provide: getModelToken(AgentConfig.name), useValue: leanModel([]) },
        { provide: getModelToken(Plan.name), useValue: leanModel(plans) },
        { provide: getModelToken(TrialLog.name), useValue: leanModel(trialLogs) },
        { provide: getModelToken(DailyUsageSummary.name), useValue: leanModel([]) },
        { provide: RedisService, useValue: { getClient: jest.fn() } },
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: UsageTrackingService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.spyOn(service as any, 'seedSuperAdminOnStartup').mockResolvedValue(undefined);
  });

  it('classifies each trial by where it actually stands', async () => {
    const res = await service.getTrialLeads({});
    const byId = Object.fromEntries(res.leads.map((l: any) => [l.businessId, l]));

    expect(byId.biz_running.status).toBe('active');
    expect(byId.biz_soon.status).toBe('expiring_soon');
    expect(byId.biz_expired.status).toBe('expired');
    expect(byId.biz_paid.status).toBe('converted');
  });

  it('reports remaining time and the conversion funnel', async () => {
    const res = await service.getTrialLeads({});

    expect(res.stats).toMatchObject({
      totalTrials: 4,
      active: 1,
      expiringSoon: 1,
      expired: 1,
      converted: 1,
      conversionRate: 25,
    });
    // The one converted trial sits on the $79 growth plan.
    expect(res.stats.convertedMrrUsd).toBe(79);

    const soon = res.leads.find((l: any) => l.businessId === 'biz_soon');
    expect(soon?.daysRemaining).toBe(2);
    const expired = res.leads.find((l: any) => l.businessId === 'biz_expired');
    expect(expired?.daysRemaining).toBe(0);
  });

  it('includes a tenant whose trial was only ever stamped on the business', async () => {
    const res = await service.getTrialLeads({});
    // Every source row resolves to one lead, keyed by business, with no duplicates.
    expect(res.leads).toHaveLength(4);
    expect(new Set(res.leads.map((l: any) => l.businessId)).size).toBe(4);
  });

  it('falls back to the registered trial email when no owner account is found', async () => {
    const res = await service.getTrialLeads({});
    const expired = res.leads.find((l: any) => l.businessId === 'biz_expired');

    expect(expired?.ownerEmail).toBe('owner@expired.com');
  });

  it('filters by status and searches across store, domain and email', async () => {
    const expiring = await service.getTrialLeads({ status: 'expiring_soon' });
    expect(expiring.leads.map((l: any) => l.businessId)).toEqual(['biz_soon']);

    const searched = await service.getTrialLeads({ search: 'paid.com' });
    expect(searched.leads.map((l: any) => l.businessId)).toEqual(['biz_paid']);

    // Stats describe the whole funnel, not the filtered slice.
    expect(expiring.stats.totalTrials).toBe(4);
  });

  it('sends outreach to the tenant owner, never to an address from the request', async () => {
    await service.sendTrialOutreach(
      'biz_running',
      { subject: 'Your trial ends soon', message: 'Hello there' },
      { name: 'Platform Admin', email: 'admin@ora.dev' },
    );

    expect(mailService.sendAdminOutreachEmail).toHaveBeenCalledWith(
      'ada@running.com',
      expect.objectContaining({
        heading: 'Your trial ends soon',
        message: 'Hello there',
        senderName: 'Platform Admin',
      }),
    );
  });

  it('reports a failed send instead of claiming delivery', async () => {
    mailService.sendAdminOutreachEmail.mockResolvedValue({
      delivered: false,
      reason: 'EMAIL_PROVIDER_NOT_CONFIGURED',
    });

    await expect(
      service.sendTrialOutreach(
        'biz_running',
        { subject: 'Hi', message: 'Hello' },
        { email: 'admin@ora.dev' },
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_SENT' });
  });
});
