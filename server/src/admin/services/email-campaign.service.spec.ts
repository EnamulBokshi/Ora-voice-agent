import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { EmailCampaignService } from './email-campaign.service';
import { AdminUser } from '../../users/schemas/admin-user.schema';
import { Business } from '../../users/schemas/business.schema';
import { Coupon, CouponDiscountType } from '../../billing/schemas/coupon.schema';
import { EmailCampaign } from '../schemas/email-campaign.schema';
import { MailService } from '../../mail/mail.service';

describe('EmailCampaignService', () => {
  let service: EmailCampaignService;
  let mailService: { sendPromotionalEmail: jest.Mock };
  let saved: any[];
  let couponModel: any;
  let adminUserModel: any;

  const businesses = [
    { _id: 'biz_a', name: 'Alpha Store' },
    { _id: 'biz_b', name: 'Beta Store' },
  ];

  const users = [
    { _id: 'u_owner_a', businessId: 'biz_a', name: 'Ada', email: 'ada@alpha.com', role: 'owner' },
    { _id: 'u_staff_a', businessId: 'biz_a', name: 'Sam', email: 'sam@alpha.com', role: 'staff' },
    {
      _id: 'u_owner_b',
      businessId: 'biz_b',
      name: 'Bo',
      email: 'bo@beta.com',
      role: 'owner',
      marketingOptOut: true,
    },
  ];

  beforeEach(async () => {
    saved = [];
    mailService = {
      sendPromotionalEmail: jest.fn().mockResolvedValue({ delivered: true }),
    };

    const chain = (rows: any[]) => ({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }),
        lean: jest.fn().mockResolvedValue(rows),
      }),
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }),
        }),
        lean: jest.fn().mockResolvedValue(rows),
      }),
      lean: jest.fn().mockResolvedValue(rows),
    });

    adminUserModel = {
      // Mirrors the real query: only accounts on the requested tenants come back.
      find: jest.fn().mockImplementation((filter: any) => {
        const ids: string[] = filter?.businessId?.$in ?? [];
        return chain(users.filter((u) => ids.includes(u.businessId)));
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ email: 'ada@alpha.com' }),
        }),
      }),
    };

    couponModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) };

    const campaignModel: any = jest.fn().mockImplementation((doc: any) => {
      saved.push(doc);
      return { save: jest.fn().mockResolvedValue({ _id: 'campaign_1', ...doc }) };
    });
    campaignModel.find = jest.fn().mockReturnValue(chain([]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailCampaignService,
        { provide: getModelToken(AdminUser.name), useValue: adminUserModel },
        { provide: getModelToken(Business.name), useValue: { find: jest.fn().mockReturnValue(chain(businesses)) } },
        { provide: getModelToken(Coupon.name), useValue: couponModel },
        { provide: getModelToken(EmailCampaign.name), useValue: campaignModel },
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') } },
      ],
    }).compile();

    service = module.get<EmailCampaignService>(EmailCampaignService);
  });

  it('writes to one contact per tenant, preferring the owner', async () => {
    const recipients = await service.resolveRecipients({ businessIds: ['biz_a', 'biz_b'] });

    expect(recipients).toHaveLength(2);
    expect(recipients.find((r) => r.businessId === 'biz_a')?.email).toBe('ada@alpha.com');
  });

  it('never sends to someone who opted out', async () => {
    const res = await service.send(
      { subject: 'Offer', message: 'Hello', businessIds: ['biz_a', 'biz_b'] },
      { email: 'admin@ora.dev' },
    );

    expect(mailService.sendPromotionalEmail).toHaveBeenCalledTimes(1);
    expect(mailService.sendPromotionalEmail).toHaveBeenCalledWith(
      'ada@alpha.com',
      expect.objectContaining({ heading: 'Offer' }),
    );
    expect(res.skippedOptOutCount).toBe(1);
    expect(res.deliveredCount).toBe(1);
  });

  it('gives every email a signed unsubscribe link', async () => {
    await service.send(
      { subject: 'Offer', message: 'Hello', businessIds: ['biz_a'] },
      { email: 'admin@ora.dev' },
    );

    const payload = mailService.sendPromotionalEmail.mock.calls[0][1];
    expect(payload.unsubscribeUrl).toMatch(/\/api\/v1\/marketing\/unsubscribe\?u=u_owner_a&t=[a-f0-9]{32}$/);
  });

  it('refuses to advertise a coupon that does not exist', async () => {
    await expect(
      service.send(
        { subject: 'Offer', message: 'Hello', couponCode: 'ghost20', businessIds: ['biz_a'] },
        { email: 'admin@ora.dev' },
      ),
    ).rejects.toMatchObject({ code: 'COUPON_INVALID' });

    expect(mailService.sendPromotionalEmail).not.toHaveBeenCalled();
  });

  it('refuses to advertise an expired coupon', async () => {
    couponModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        code: 'OLD20',
        isActive: true,
        discountType: CouponDiscountType.PERCENT,
        percentOff: 20,
        expiresAt: new Date(Date.now() - 86400000),
      }),
    });

    await expect(
      service.send(
        { subject: 'Offer', message: 'Hello', couponCode: 'OLD20', businessIds: ['biz_a'] },
        { email: 'admin@ora.dev' },
      ),
    ).rejects.toMatchObject({ code: 'COUPON_EXPIRED' });
  });

  it('describes a valid coupon from the catalogue rather than from the admin copy', async () => {
    couponModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        code: 'DULAVAI20',
        isActive: true,
        discountType: CouponDiscountType.PERCENT,
        percentOff: 50,
        expiresAt: null,
      }),
    });

    await service.send(
      { subject: 'Offer', message: 'Hello', couponCode: 'dulavai20', businessIds: ['biz_a'] },
      { email: 'admin@ora.dev' },
    );

    expect(mailService.sendPromotionalEmail).toHaveBeenCalledWith(
      'ada@alpha.com',
      expect.objectContaining({
        couponCode: 'DULAVAI20',
        couponDetail: '50% off your subscription',
      }),
    );
  });

  it('records the send, including failures, for audit', async () => {
    mailService.sendPromotionalEmail.mockResolvedValue({ delivered: false, reason: 'bounced' });

    const res = await service.send(
      { subject: 'Offer', message: 'Hello', businessIds: ['biz_a'] },
      { userId: 'admin_1', email: 'admin@ora.dev' },
    );

    expect(res.failedCount).toBe(1);
    expect(saved[0]).toMatchObject({
      subject: 'Offer',
      deliveredCount: 0,
      failedCount: 1,
      sentByEmail: 'admin@ora.dev',
    });
    expect(saved[0].results[0]).toMatchObject({ email: 'ada@alpha.com', delivered: false });
  });

  it('refuses a send whose audience is entirely opted out', async () => {
    await expect(
      service.send({ subject: 'Offer', message: 'Hello', businessIds: ['biz_b'] }, {}),
    ).rejects.toMatchObject({ code: 'NO_RECIPIENTS' });
  });

  it('honours an unsubscribe link only with a matching signature', async () => {
    await expect(service.unsubscribe('u_owner_a', 'not-the-token')).rejects.toMatchObject({
      code: 'INVALID_UNSUBSCRIBE_LINK',
    });
    expect(adminUserModel.findByIdAndUpdate).not.toHaveBeenCalled();

    const url = (service as any).unsubscribeUrl('u_owner_a');
    const token = new URL(url).searchParams.get('t') as string;

    await service.unsubscribe('u_owner_a', token);

    expect(adminUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'u_owner_a',
      { $set: { marketingOptOut: true, marketingOptOutAt: expect.any(Date) } },
      { new: true },
    );
  });
});
