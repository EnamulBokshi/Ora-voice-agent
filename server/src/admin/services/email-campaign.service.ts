import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { AdminUser, AdminUserDocument } from '../../users/schemas/admin-user.schema';
import { AdminRole } from '../../users/enums/admin-role.enum';
import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import { Coupon, CouponDocument, CouponDiscountType } from '../../billing/schemas/coupon.schema';
import { MailService } from '../../mail/mail.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import {
  EmailCampaign,
  EmailCampaignDocument,
} from '../schemas/email-campaign.schema';

/** One merchant contact a campaign can reach. */
interface Recipient {
  businessId: string;
  userId: string;
  email: string;
  name: string;
  storeName: string;
  optedOut: boolean;
}

/** Sends per batch, with a pause between batches, to stay inside provider limits. */
const BATCH_SIZE = 10;
const BATCH_PAUSE_MS = 1100;

/** A campaign may not exceed this in one call; anything larger is a mistake. */
const MAX_RECIPIENTS_PER_SEND = 500;

@Injectable()
export class EmailCampaignService {
  private readonly logger = new Logger(EmailCampaignService.name);

  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    @InjectModel(EmailCampaign.name)
    private readonly campaignModel: Model<EmailCampaignDocument>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private get frontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ||
      (this.configService.get<string>('NODE_ENV') === 'production'
        ? 'https://tryora.live'
        : 'http://localhost:3000')
    );
  }

  /**
   * Signs an unsubscribe link for one account.
   *
   * The token is an HMAC of the account id, so a link cannot be edited into someone
   * else's opt-out and the endpoint needs no session to honour it.
   */
  private signUnsubscribe(userId: string): string {
    const secret =
      this.configService.get<string>('JWT_SECRET') || 'ora-secret-key-change-in-prod';
    return crypto
      .createHmac('sha256', secret)
      .update(`unsubscribe:${userId}`)
      .digest('hex')
      .slice(0, 32);
  }

  private unsubscribeUrl(userId: string): string {
    const apiBase = this.configService.get<string>('API_PUBLIC_URL') || this.frontendUrl;
    return `${apiBase}/api/v1/marketing/unsubscribe?u=${userId}&t=${this.signUnsubscribe(userId)}`;
  }

  /** Honours an unsubscribe link. Wrong or missing signature changes nothing. */
  async unsubscribe(userId: string, token: string): Promise<{ email?: string }> {
    if (!userId || !token) {
      throw new DomainException(
        'INVALID_UNSUBSCRIBE_LINK',
        'That unsubscribe link is not valid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const expected = this.signUnsubscribe(userId);
    const provided = Buffer.from(token);
    const valid =
      provided.length === expected.length &&
      crypto.timingSafeEqual(provided, Buffer.from(expected));

    if (!valid) {
      throw new DomainException(
        'INVALID_UNSUBSCRIBE_LINK',
        'That unsubscribe link is not valid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.adminUserModel
      .findByIdAndUpdate(
        userId,
        { $set: { marketingOptOut: true, marketingOptOutAt: new Date() } },
        { new: true },
      )
      .select('email')
      .lean();

    if (!user) {
      throw new DomainException(
        'INVALID_UNSUBSCRIBE_LINK',
        'That unsubscribe link is not valid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`[EmailCampaignService] ${user.email} opted out of promotional email.`);
    return { email: user.email };
  }

  /**
   * Resolves who a campaign would reach, one contact per tenant.
   *
   * Only the account that owns the tenant is written to: staff accounts are not
   * marketing contacts, and a tenant should not receive the same offer five times.
   */
  async resolveRecipients(target: {
    businessIds?: string[];
    audience?: string;
  }): Promise<Recipient[]> {
    let businessIds = target.businessIds?.filter(Boolean) ?? [];

    if (businessIds.length === 0) {
      const filter: any = { name: { $ne: 'ORA Platform' } };
      if (target.audience === 'active_merchants') filter.status = 'active';
      if (target.audience === 'pending_merchants') filter.status = 'pending';

      const businesses = await this.businessModel.find(filter).select('_id').lean();
      businessIds = businesses.map((b: any) => String(b._id));
    }

    if (businessIds.length === 0) return [];

    const [businesses, users] = await Promise.all([
      this.businessModel
        .find({ _id: { $in: businessIds } } as any)
        .select('name')
        .lean(),
      this.adminUserModel
        .find({ businessId: { $in: businessIds } } as any)
        .select('name email businessId role marketingOptOut createdAt')
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    const storeName = new Map(businesses.map((b: any) => [String(b._id), b.name]));
    const chosen = new Map<string, any>();

    for (const user of users as any[]) {
      const key = String(user.businessId);
      const current = chosen.get(key);
      // Prefer the owner; otherwise the earliest account on the tenant.
      if (!current || (user.role === AdminRole.OWNER && current.role !== AdminRole.OWNER)) {
        chosen.set(key, user);
      }
    }

    return Array.from(chosen.entries()).map(([businessId, user]) => ({
      businessId,
      userId: String(user._id),
      email: user.email,
      name: user.name || 'there',
      storeName: storeName.get(businessId) || 'your store',
      optedOut: user.marketingOptOut === true,
    }));
  }

  /** A preview an admin sees before sending: who is in, and who is suppressed. */
  async previewAudience(target: { businessIds?: string[]; audience?: string }) {
    const recipients = await this.resolveRecipients(target);
    return {
      total: recipients.length,
      sendable: recipients.filter((r) => !r.optedOut).length,
      optedOut: recipients.filter((r) => r.optedOut).length,
      sample: recipients
        .filter((r) => !r.optedOut)
        .slice(0, 5)
        .map((r) => ({ email: r.email, storeName: r.storeName })),
    };
  }

  /**
   * Sends a campaign and records what happened.
   *
   * A coupon code named in the campaign is verified against the coupon catalogue
   * first. Advertising a code that does not exist, or has expired, costs more
   * goodwill than the send was ever going to earn.
   */
  async send(
    payload: {
      subject: string;
      message: string;
      couponCode?: string;
      ctaUrl?: string;
      businessIds?: string[];
      audience?: string;
    },
    sender: { userId?: string; email?: string },
  ) {
    const recipients = await this.resolveRecipients({
      businessIds: payload.businessIds,
      audience: payload.audience,
    });

    const sendable = recipients.filter((r) => !r.optedOut);
    const skippedOptOutCount = recipients.length - sendable.length;

    if (sendable.length === 0) {
      throw new DomainException(
        'NO_RECIPIENTS',
        recipients.length === 0
          ? 'No merchants matched that audience, so nothing was sent.'
          : 'Every merchant in that audience has opted out of promotional email.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (sendable.length > MAX_RECIPIENTS_PER_SEND) {
      throw new DomainException(
        'AUDIENCE_TOO_LARGE',
        `That audience is ${sendable.length} merchants. Send to at most ${MAX_RECIPIENTS_PER_SEND} at a time.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    let couponDetail: string | null = null;
    let couponCode: string | null = null;

    if (payload.couponCode) {
      couponCode = payload.couponCode.trim().toUpperCase();
      const coupon = await this.couponModel.findOne({ code: couponCode }).lean();

      if (!coupon || coupon.isActive === false) {
        throw new DomainException(
          'COUPON_INVALID',
          `There is no active coupon called ${couponCode}. Create it before advertising it.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
        throw new DomainException(
          'COUPON_EXPIRED',
          `${couponCode} has already expired, so it cannot be advertised.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      couponDetail =
        coupon.discountType === CouponDiscountType.PERCENT
          ? `${coupon.percentOff}% off your subscription`
          : `$${(coupon.amountOffUsdCents / 100).toFixed(2)} off your subscription`;

      if (coupon.expiresAt) {
        couponDetail += ` · expires ${new Date(coupon.expiresAt).toLocaleDateString('en-CA')}`;
      }
    }

    const results: Array<{
      businessId: string;
      email: string;
      delivered: boolean;
      reason?: string;
    }> = [];

    // Batched with a pause between batches: a provider rate limit would otherwise
    // fail the tail of a large send for no reason other than speed.
    for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
      const batch = sendable.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          const outcome = await this.mailService.sendPromotionalEmail(recipient.email, {
            recipientName: recipient.name,
            heading: payload.subject,
            message: payload.message,
            couponCode,
            couponDetail,
            ctaUrl: payload.ctaUrl || null,
            ctaLabel: 'Open ORA',
            unsubscribeUrl: this.unsubscribeUrl(recipient.userId),
          });

          return {
            businessId: recipient.businessId,
            email: recipient.email,
            delivered: outcome.delivered,
            ...(outcome.reason ? { reason: outcome.reason } : {}),
          };
        }),
      );

      results.push(...batchResults);

      if (i + BATCH_SIZE < sendable.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
      }
    }

    const deliveredCount = results.filter((r) => r.delivered).length;
    const failedCount = results.length - deliveredCount;

    const campaign = await new this.campaignModel({
      subject: payload.subject,
      message: payload.message,
      couponCode,
      ctaUrl: payload.ctaUrl || null,
      audience: payload.businessIds?.length
        ? `selected:${payload.businessIds.length}`
        : payload.audience || 'all_merchants',
      recipientCount: results.length,
      deliveredCount,
      failedCount,
      skippedOptOutCount,
      results,
      sentBy: (sender.userId as any) ?? null,
      sentByEmail: sender.email ?? null,
    }).save();

    this.logger.log(
      `[EmailCampaignService] Campaign "${payload.subject}" sent by ${sender.email || 'platform admin'}: ${deliveredCount} delivered, ${failedCount} failed, ${skippedOptOutCount} opted out.`,
    );

    return {
      campaignId: String(campaign._id),
      recipientCount: results.length,
      deliveredCount,
      failedCount,
      skippedOptOutCount,
      failures: results.filter((r) => !r.delivered).slice(0, 20),
    };
  }

  /** Past sends, newest first, without the per-recipient detail. */
  async history(limit = 25) {
    return this.campaignModel
      .find()
      .sort({ createdAt: -1 })
      .limit(Math.min(100, Math.max(1, limit)))
      .select('-results')
      .lean();
  }
}
