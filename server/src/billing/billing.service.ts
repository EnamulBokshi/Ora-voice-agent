import { Injectable, OnModuleInit, HttpStatus, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Plan, PlanDocument, PlanId } from './schemas/plan.schema';
import {
  Subscription,
  SubscriptionDocument,
  BillingProvider,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  TransactionStatus,
} from './schemas/payment-transaction.schema';
import { SubscribeDto } from './dto/subscribe.dto';
import { StripeProvider } from './providers/stripe.provider';
import { BkashProvider } from './providers/bkash.provider';
import { InvoicesService } from '../invoices/invoices.service';
import { RedisService } from '../common/redis/redis.service';
import { MailService } from '../mail/mail.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { AdminUser, AdminUserDocument } from '../users/schemas/admin-user.schema';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { AdminRole } from '../users/enums/admin-role.enum';
import { OnboardingEmailService } from '../auth/services/onboarding-email.service';
import { EntitlementService } from '../common/entitlement/entitlement.service';

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(PaymentTransaction.name)
    private readonly transactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    private readonly stripeProvider: StripeProvider,
    private readonly bkashProvider: BkashProvider,
    private readonly invoicesService: InvoicesService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => OnboardingEmailService))
    private readonly onboardingEmailService: OnboardingEmailService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  async getPlans(): Promise<PlanDocument[]> {
    return this.planModel.find({ isActive: true }).exec();
  }

  async getSubscription(businessId: string) {
    let sub = await this.subscriptionModel
      .findOne({ businessId: businessId as any })
      .exec();

    if (!sub) {
      // Default initial Free tier subscription
      const freePlan = await this.planModel.findOne({ planId: PlanId.FREE }).exec();
      sub = await new this.subscriptionModel({
        businessId: businessId as any,
        planId: PlanId.FREE,
        billingProvider: BillingProvider.STRIPE,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).save();
    }

    const plan = await this.planModel.findOne({ planId: sub.planId as any }).exec();

    // Fetch Redis usage counters
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const redisClient = this.redisService.getClient();

    const [mins, orders, business, seatsCount] = await Promise.all([
      redisClient.get(`usage:${businessId}:${currentPeriod}:conversationMinutes`),
      redisClient.get(`usage:${businessId}:${currentPeriod}:ordersPerMonth`),
      this.businessModel.findById(businessId).exec(),
      this.adminUserModel.countDocuments({ businessId: businessId as any }).exec(),
    ]);

    let connectedStoresCount = 0;
    if (business) {
      if (business.shopifyStoreUrl) connectedStoresCount++;
      if (business.woocommerceStoreUrl) connectedStoresCount++;
      if (connectedStoresCount === 0 && business.connectedPlatform && business.connectedPlatform !== 'none') {
        connectedStoresCount = 1;
      }
    }

    return {
      subscription: sub,
      plan,
      usage: {
        conversationMinutes: mins ? parseInt(mins, 10) : 0,
        ordersPerMonth: orders ? parseInt(orders, 10) : 0,
        connectedStores: connectedStoresCount,
        seats: seatsCount || 1,
      },
    };
  }

  async subscribe(
    businessId: string,
    dto: SubscribeDto,
    userContext?: { email?: string; name?: string; userId?: string },
  ) {
    const plan = await this.planModel.findOne({ planId: dto.planId }).exec();
    if (!plan) {
      throw new DomainException(
        'PLAN_NOT_FOUND',
        `Plan '${dto.planId}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const bId = businessId as any;

    // Resolve user details for billing provider customer record
    let customerEmail = userContext?.email;
    let customerName = userContext?.name;

    if (!customerEmail || !customerName) {
      const user = userContext?.userId
        ? await this.adminUserModel.findById(userContext.userId).exec()
        : await this.adminUserModel.findOne({ businessId: bId }).sort({ createdAt: 1 }).exec();
      if (user) {
        customerEmail = customerEmail || user.email;
        customerName = customerName || user.name;
      }
    }

    // 1. Handle Free Tier Subscription (0 cost — instant activation)
    if (dto.planId === PlanId.FREE || (plan.priceUsdCents === 0 && plan.priceBdtPaisa === 0)) {
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const sub = await this.subscriptionModel.findOneAndUpdate(
        { businessId: bId },
        {
          $set: {
            planId: PlanId.FREE,
            billingProvider: BillingProvider.STRIPE,
            providerRef: 'free_tier',
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        },
        { upsert: true, returnDocument: 'after' },
      ).exec();

      // Activate business & generate key if needed
      const business = await this.businessModel.findById(bId).exec();
      if (business) {
        if (!business.publishableKey) {
          const randomHex = crypto.randomBytes(12).toString('hex');
          business.publishableKey = `biz_live_${randomHex}`;
        }
        business.status = 'active';
        await business.save();
      }

      // Upgrade subscriber role from 'user' to 'owner'.
      //
      // Scoped to USER on purpose. This used to promote every account in the
      // tenant that was not a SUPER_ADMIN, so activating a plan handed OWNER
      // rights — billing, secret key, connector config — to every staff member
      // the tenant had. Shopify tenants provision non-owner staff as STAFF,
      // and a promotion here would undo that on the first charge.
      await this.adminUserModel.updateMany(
        { businessId: bId, role: AdminRole.USER },
        { $set: { role: AdminRole.OWNER } },
      ).exec();

      // Dispatch Congratulations email and ORA credentials & widget embed manual email
      await this.sendSubscriberWelcomeEmail(businessId, plan.name);

      return {
        requiresRedirect: false,
        subscription: sub,
        message: 'Free tier activated successfully.',
      };
    }

    // 2. Handle bKash Subscription Initiation
    if (dto.billingProvider === BillingProvider.BKASH) {
      const subRef = await this.bkashProvider.createSubscription(businessId, dto.planId, {
        email: customerEmail,
        name: customerName,
      });
      
      let bkashURL = '';
      let paymentID = '';
      if (subRef.providerRef) {
        try {
          const parsed = JSON.parse(subRef.providerRef);
          bkashURL = parsed.bkashURL;
          paymentID = parsed.paymentID;
        } catch {
          // ignore
        }
      }

      return {
        requiresRedirect: true,
        billingProvider: BillingProvider.BKASH,
        bkashURL,
        paymentID,
        message: 'Please complete agreement authorization on bKash redirect URL.',
      };
    }

    // 3. Handle Stripe Subscription Flow
    const subRef = await this.stripeProvider.createSubscription(businessId, dto.planId, {
      email: customerEmail,
      name: customerName,
    });

    // If Stripe created an online Hosted Checkout URL
    if (
      subRef.providerRef &&
      (subRef.providerRef.startsWith('http://') || subRef.providerRef.startsWith('https://'))
    ) {
      return {
        requiresRedirect: true,
        billingProvider: BillingProvider.STRIPE,
        checkoutUrl: subRef.providerRef,
        subscriptionId: subRef.subscriptionId,
        message: 'Please complete subscription checkout on Stripe.',
      };
    }

    // 4. Development / Mock fallback when Stripe credentials are not live
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const sub = await this.subscriptionModel.findOneAndUpdate(
      { businessId: bId },
      {
        $set: {
          planId: dto.planId,
          billingProvider: BillingProvider.STRIPE,
          providerRef: subRef.providerRef,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).exec();

    // Record append-only PaymentTransaction
    const transaction = await new this.transactionModel({
      businessId: bId,
      subscriptionId: sub._id as any,
      billingProvider: BillingProvider.STRIPE,
      providerTransactionId: subRef.subscriptionId,
      amount: plan.priceUsdCents / 100,
      currency: 'USD',
      status: TransactionStatus.SUCCEEDED,
      billingPeriodStart: periodStart,
    }).save();

    // Trigger sequential human-readable invoice generation (ORA-2026-000123)
    const invoice = await this.invoicesService.generateInvoice({
      businessId,
      subscriptionId: sub._id.toString(),
      transactionId: transaction._id.toString(),
      amountUsdCents: plan.priceUsdCents,
      amountBdtPaisa: plan.priceBdtPaisa,
      currency: 'USD',
    });

    // Generate publishable key if none exists for this business & activate business
    const business = await this.businessModel.findById(bId).exec();
    if (business) {
      if (!business.publishableKey) {
        const randomHex = crypto.randomBytes(12).toString('hex');
        business.publishableKey = `biz_live_${randomHex}`;
      }
      business.status = 'active';
      await business.save();
    }

    // Upgrade subscriber role from 'user' to 'owner' upon active subscription
    await this.adminUserModel.updateMany(
      { businessId: bId, role: AdminRole.USER },
      { $set: { role: AdminRole.OWNER } },
    ).exec();

    // Dispatch Congratulations email and ORA credentials & widget embed manual email
    await this.sendSubscriberWelcomeEmail(businessId, plan.name);

    return {
      requiresRedirect: false,
      subscription: sub,
      transaction,
      invoice,
      message: 'Subscription activated in sandbox development mode.',
    };
  }

  async executeBkashAgreement(businessId: string, paymentID: string, planId?: string) {
    const targetPlanId = planId || PlanId.GROWTH;
    const plan = await this.planModel.findOne({ planId: targetPlanId as any }).exec();
    if (!plan) {
      throw new DomainException(
        'PLAN_NOT_FOUND',
        `Plan '${targetPlanId}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Step 1: Execute Agreement on bKash API
    const agreementRes = await this.bkashProvider.executeAgreement(paymentID);
    const agreementID = agreementRes.agreementID;

    // Step 2: Execute Initial Payment for Subscription
    const invoiceNumber = `ORA-BKASH-${Date.now()}`;
    const amountBdt = plan.priceBdtPaisa / 100;
    const paymentRes = await this.bkashProvider.executePaymentWithAgreement(
      agreementID,
      amountBdt,
      invoiceNumber,
      businessId,
    );

    // Step 3: Update Subscription Document
    const bId = businessId as any;
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const sub = await this.subscriptionModel.findOneAndUpdate(
      { businessId: bId },
      {
        $set: {
          planId: targetPlanId,
          billingProvider: BillingProvider.BKASH,
          providerRef: agreementID,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).exec();

    // Step 4: Record Payment Transaction
    const transaction = await new this.transactionModel({
      businessId: bId,
      subscriptionId: sub._id as any,
      billingProvider: BillingProvider.BKASH,
      providerTransactionId: paymentRes.trxID || paymentRes.paymentID,
      amount: amountBdt,
      currency: 'BDT',
      status: TransactionStatus.SUCCEEDED,
      billingPeriodStart: periodStart,
    }).save();

    // Step 5: Generate Sequential Invoice
    const invoice = await this.invoicesService.generateInvoice({
      businessId,
      subscriptionId: sub._id.toString(),
      transactionId: transaction._id.toString(),
      amountUsdCents: plan.priceUsdCents,
      amountBdtPaisa: plan.priceBdtPaisa,
      currency: 'BDT',
    });

    // Generate publishable key if none exists for this business & activate business
    const business = await this.businessModel.findById(bId).exec();
    if (business) {
      if (!business.publishableKey) {
        const randomHex = crypto.randomBytes(12).toString('hex');
        business.publishableKey = `biz_live_${randomHex}`;
      }
      business.status = 'active';
      await business.save();
    }

    // Upgrade subscriber role from 'user' to 'owner' upon active bKash agreement
    await this.adminUserModel.updateMany(
      { businessId: bId, role: AdminRole.USER },
      { $set: { role: AdminRole.OWNER } },
    ).exec();

    // Dispatch Congratulations email and ORA credentials & widget embed manual email
    await this.sendSubscriberWelcomeEmail(businessId, plan.name);

    return {
      success: true,
      agreementID,
      subscription: sub,
      transaction,
      invoice,
    };
  }

  async processBkashRenewals() {
    const now = new Date();
    const expiringSubs = await this.subscriptionModel
      .find({
        billingProvider: BillingProvider.BKASH,
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
        currentPeriodEnd: { $lte: now },
      })
      .exec();

    this.logger.log(
      `[BillingService] Found ${expiringSubs.length} bKash subscriptions due for renewal processing.`,
    );

    const results: any[] = [];

    for (const sub of expiringSubs) {
      if (!sub.providerRef) continue;

      const plan = await this.planModel.findOne({ planId: sub.planId as any }).exec();

      const chargeRes = await this.bkashProvider.chargeRenewal({
        subscriptionId: sub._id.toString(),
        providerRef: sub.providerRef,
      });

      if (chargeRes.success) {
        const periodStart = new Date();
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        sub.status = SubscriptionStatus.ACTIVE;
        sub.currentPeriodStart = periodStart;
        sub.currentPeriodEnd = periodEnd;
        await sub.save();

        const transaction = await new this.transactionModel({
          businessId: sub.businessId,
          subscriptionId: sub._id,
          billingProvider: BillingProvider.BKASH,
          providerTransactionId: chargeRes.transactionId || `BKASH-REN-${Date.now()}`,
          amount: chargeRes.amount || 5500,
          currency: 'BDT',
          status: TransactionStatus.SUCCEEDED,
          billingPeriodStart: periodStart,
        }).save();

        const invoice = await this.invoicesService.generateInvoice({
          businessId: sub.businessId.toString(),
          subscriptionId: sub._id.toString(),
          transactionId: transaction._id.toString(),
          amountUsdCents: plan ? plan.priceUsdCents : 4900,
          amountBdtPaisa: plan ? plan.priceBdtPaisa : 550000,
          currency: 'BDT',
        });

        results.push({ subscriptionId: sub._id, status: 'RENEWED', invoiceNumber: invoice.invoiceNumber });
      } else {
        sub.status = SubscriptionStatus.PAST_DUE;
        await sub.save();

        await new this.transactionModel({
          businessId: sub.businessId,
          subscriptionId: sub._id,
          billingProvider: BillingProvider.BKASH,
          providerTransactionId: `FAILED-${Date.now()}`,
          amount: plan ? plan.priceBdtPaisa / 100 : 5500,
          currency: 'BDT',
          status: TransactionStatus.FAILED,
          billingPeriodStart: sub.currentPeriodStart,
        }).save();

        results.push({ subscriptionId: sub._id, status: 'FAILED', error: chargeRes.errorMessage });
      }
    }

    return { processed: expiringSubs.length, results };
  }

  async cancelSubscription(businessId: string) {
    const sub = await this.subscriptionModel
      .findOneAndUpdate(
        { businessId: businessId as any },
        { $set: { cancelAtPeriodEnd: true } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!sub) {
      throw new DomainException(
        'SUBSCRIPTION_NOT_FOUND',
        'No active subscription found.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      message: 'Subscription will be canceled at the end of the current billing period.',
      subscription: sub,
    };
  }

  async incrementUsage(
    businessId: string,
    metricKey: string,
    amount = 1,
  ): Promise<number> {
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const redisKey = `usage:${businessId}:${currentPeriod}:${metricKey}`;
    const newCount = await this.redisService.getClient().incrby(redisKey, amount);
    return newCount;
  }

  private async seedDefaultPlans() {
    const count = await this.planModel.countDocuments().exec();
    if (count > 0) {
      await this.backfillTrialDays();
      return;
    }

    this.logger.log('[BillingService] Seeding default plan tiers (Free, Growth, Scale)...');

    const defaultPlans = [
      {
        planId: PlanId.FREE,
        name: 'Free Tier',
        priceUsdCents: 0,
        priceBdtPaisa: 0,
        billingInterval: 'month',
        limits: {
          conversationMinutes: 100,
          ordersPerMonth: 20,
          connectedStores: 1,
          seats: 1,
        },
        features: ['100 conversation minutes', '20 Tier 1 orders', '1 store connector', 'Basic RAG search'],
        trialDays: 0,
        isActive: true,
      },
      {
        planId: PlanId.GROWTH,
        name: 'Growth Plan',
        priceUsdCents: 4900,
        priceBdtPaisa: 550000,
        billingInterval: 'month',
        limits: {
          conversationMinutes: 2000,
          ordersPerMonth: 500,
          connectedStores: 3,
          seats: 5,
        },
        features: ['2,000 conversation minutes', '500 Tier 1 orders', '3 store connectors', '5 staff seats', 'Full RAG vector search'],
        trialDays: 14,
        isActive: true,
      },
      {
        planId: PlanId.SCALE,
        name: 'Scale Plan',
        priceUsdCents: 19900,
        priceBdtPaisa: 2200000,
        billingInterval: 'month',
        limits: {
          conversationMinutes: 100000,
          ordersPerMonth: 100000,
          connectedStores: 99,
          seats: 99,
        },
        features: ['Unlimited conversation minutes', 'Unlimited orders', 'Unlimited store connectors', 'Unlimited seats', 'Priority support'],
        trialDays: 14,
        isActive: true,
      },
    ];

    await this.planModel.insertMany(defaultPlans);
  }

  /**
   * Gives an already-seeded deployment the trial it was advertising.
   *
   * `trialDays` was added after these documents existed, and a Mongoose default
   * applies only to new ones — so a plan seeded earlier reads back `undefined`
   * and Shopify charges on approval. The paid tiers get 14 days; nothing that
   * already carries a value is touched.
   */
  private async backfillTrialDays(): Promise<void> {
    const result = await this.planModel
      .updateMany(
        { trialDays: { $exists: false }, planId: { $ne: PlanId.FREE } },
        { $set: { trialDays: 14 } },
      )
      .exec();

    if (result.modifiedCount) {
      this.logger.log(
        `[BillingService] Backfilled trialDays on ${result.modifiedCount} plan(s).`,
      );
    }

    await this.planModel
      .updateMany(
        { trialDays: { $exists: false }, planId: PlanId.FREE },
        { $set: { trialDays: 0 } },
      )
      .exec();
  }

  private async sendSubscriberWelcomeEmail(businessId: string, planName = 'Growth Plan') {
    try {
      const bId = businessId as any;
      const [business, owner] = await Promise.all([
        this.businessModel.findById(bId).exec(),
        this.adminUserModel
          // The tenant's owner, which is who a welcome email is addressed to.
          // This used to be "any account that is not a SUPER_ADMIN", which on
          // a tenant with staff picked whoever was created first.
          .findOne({ businessId: bId, role: AdminRole.OWNER })
          .exec(),
      ]);

      if (business && owner) {
        const frontendUrl =
          this.configService.get<string>('FRONTEND_URL') ||
          (this.configService.get<string>('NODE_ENV') === 'production'
            ? 'https://tryora.live'
            : 'http://localhost:3000');

        // 1. Dispatch Congratulations Email
        await this.mailService.sendCongratulationsEmail(owner.email, {
          recipientName: owner.name,
          storeName: business.name,
          planName: planName,
          dashboardUrl: `${frontendUrl}/dashboard`,
        });

        // 2. Dispatch ORA Voice AI Credentials & User Manual Email
        if (this.onboardingEmailService && business.publishableKey) {
          await this.onboardingEmailService.sendOnboardingEmail({
            toEmail: owner.email,
            merchantName: owner.name,
            storeName: business.name,
            publishableKey: business.publishableKey,
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `[BillingService] Failed to dispatch onboarding welcome/credentials emails: ${err.message}`,
      );
    }
  }

  async handleStripeWebhookEvent(event: any): Promise<void> {
    const eventType = event?.type;
    const dataObject = event?.data?.object;

    this.logger.log(`[BillingService] Processing Stripe webhook event: ${eventType}`);

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = dataObject;
        const businessId = session.metadata?.businessId;
        const planId = session.metadata?.planId || PlanId.GROWTH;
        const subscriptionId = session.subscription || session.id;

        if (!businessId) {
          this.logger.warn(`[BillingService] checkout.session.completed missing businessId in metadata`);
          return;
        }

        const plan = await this.planModel.findOne({ planId: planId as any }).exec();
        const bId = businessId as any;
        const periodStart = new Date();
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // 1. Activate or Upsert Subscription
        const sub = await this.subscriptionModel.findOneAndUpdate(
          { businessId: bId },
          {
            $set: {
              planId: planId,
              billingProvider: BillingProvider.STRIPE,
              providerRef: subscriptionId,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            },
          },
          { upsert: true, returnDocument: 'after' },
        ).exec();

        // 2. Record Payment Transaction
        const amountUsd = session.amount_total ? session.amount_total / 100 : (plan ? plan.priceUsdCents / 100 : 49);
        const transaction = await new this.transactionModel({
          businessId: bId,
          subscriptionId: sub._id as any,
          billingProvider: BillingProvider.STRIPE,
          providerTransactionId: session.payment_intent || session.id,
          amount: amountUsd,
          currency: 'USD',
          status: TransactionStatus.SUCCEEDED,
          billingPeriodStart: periodStart,
        }).save();

        // 3. Generate Sequential Invoice
        await this.invoicesService.generateInvoice({
          businessId,
          subscriptionId: sub._id.toString(),
          transactionId: transaction._id.toString(),
          amountUsdCents: Math.round(amountUsd * 100),
          amountBdtPaisa: plan ? plan.priceBdtPaisa : 550000,
          currency: 'USD',
        });

        // 4. Activate Business & Generate Key
        const business = await this.businessModel.findById(bId).exec();
        if (business) {
          if (!business.publishableKey) {
            const randomHex = crypto.randomBytes(12).toString('hex');
            business.publishableKey = `biz_live_${randomHex}`;
          }
          business.status = 'active';
          await business.save();
        }

        // 5. Upgrade AdminUser role to OWNER
        await this.adminUserModel.updateMany(
          { businessId: bId, role: AdminRole.USER },
          { $set: { role: AdminRole.OWNER } },
        ).exec();

        // 6. Send Congratulations and Credentials Email
        await this.sendSubscriberWelcomeEmail(businessId, plan ? plan.name : 'Growth Plan');
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        const invoice = dataObject;
        const stripeSubId = invoice.subscription;
        if (!stripeSubId) break;

        const sub = await this.subscriptionModel.findOne({ providerRef: stripeSubId }).exec();
        if (sub) {
          const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();
          const periodEnd = invoice.period_end ? new Date(invoice.period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          sub.status = SubscriptionStatus.ACTIVE;
          sub.currentPeriodStart = periodStart;
          sub.currentPeriodEnd = periodEnd;
          await sub.save();

          const amountUsd = invoice.amount_paid ? invoice.amount_paid / 100 : (invoice.total ? invoice.total / 100 : 49);
          const plan = await this.planModel.findOne({ planId: sub.planId as any }).exec();

          const transaction = await new this.transactionModel({
            businessId: sub.businessId,
            subscriptionId: sub._id,
            billingProvider: BillingProvider.STRIPE,
            providerTransactionId: invoice.payment_intent || invoice.id || `TXN-${Date.now()}`,
            amount: amountUsd,
            currency: 'USD',
            status: TransactionStatus.SUCCEEDED,
            billingPeriodStart: periodStart,
          }).save();

          await this.invoicesService.generateInvoice({
            businessId: sub.businessId.toString(),
            subscriptionId: sub._id.toString(),
            transactionId: transaction._id.toString(),
            amountUsdCents: Math.round(amountUsd * 100),
            amountBdtPaisa: plan ? plan.priceBdtPaisa : 550000,
            currency: 'USD',
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = dataObject;
        const stripeSubId = invoice.subscription;
        if (!stripeSubId) break;

        const sub = await this.subscriptionModel.findOne({ providerRef: stripeSubId }).exec();
        if (sub) {
          sub.status = SubscriptionStatus.PAST_DUE;
          await sub.save();

          await new this.transactionModel({
            businessId: sub.businessId,
            subscriptionId: sub._id,
            billingProvider: BillingProvider.STRIPE,
            providerTransactionId: `FAILED-${Date.now()}`,
            amount: invoice.amount_due ? invoice.amount_due / 100 : 49,
            currency: 'USD',
            status: TransactionStatus.FAILED,
            billingPeriodStart: sub.currentPeriodStart,
          }).save();
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = dataObject;
        const sub = await this.subscriptionModel.findOne({ providerRef: stripeSub.id }).exec();
        if (sub) {
          sub.cancelAtPeriodEnd = !!stripeSub.cancel_at_period_end;
          if (stripeSub.status === 'active') sub.status = SubscriptionStatus.ACTIVE;
          else if (stripeSub.status === 'past_due') sub.status = SubscriptionStatus.PAST_DUE;
          else if (stripeSub.status === 'canceled') sub.status = SubscriptionStatus.CANCELED;
          await sub.save();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = dataObject;
        const sub = await this.subscriptionModel.findOne({ providerRef: stripeSub.id }).exec();
        if (sub) {
          sub.status = SubscriptionStatus.CANCELED;
          await sub.save();
        }
        break;
      }

      default:
        this.logger.log(`[BillingService] Unhandled Stripe event type: ${eventType}`);
        break;
    }
  }

  async activateShopifySubscription(
    businessId: string,
    chargeId: string,
    status: string,
    planId?: string,
    currentPeriodEnd?: Date,
  ) {
    const isApproved = status === 'ACTIVE';
    const subStatus = isApproved
      ? SubscriptionStatus.ACTIVE
      : SubscriptionStatus.SUSPENDED;

    const existing = await this.subscriptionModel
      .findOne({ businessId: businessId as any })
      .exec();

    // `planId` is required on the schema, so an upsert with no plan fails
    // validation. The plan is no longer read from the callback's query string,
    // so "unknown plan" is reachable — a dropped Redis record plus a Shopify
    // name that matches nothing. Refuse rather than create an invalid document
    // or guess a tier.
    if (!planId && !existing) {
      this.logger.error(
        `[BillingService] Shopify charge ${chargeId} for business ${businessId} could not be matched to a plan, and the business has no subscription to update. No state applied.`,
      );
      return null;
    }

    const updateSet: Record<string, any> = {
      billingProvider: BillingProvider.SHOPIFY,
      // Numeric id only. `applyShopifySubscriptionState` looks the document up
      // by this field from a webhook that carries a gid, so both writers have
      // to agree on the form.
      providerRef: (chargeId || '').split('/').pop() || chargeId,
      status: subStatus,
    };

    if (planId) {
      updateSet.planId = planId;
    }

    // Shopify charges on its own cadence and owns the renewal date, so the
    // period end is whatever it reports. `cancelAtPeriodEnd` is deliberately
    // not written here: it used to be forced to false on every callback, which
    // silently cleared a cancellation the merchant had already requested.
    if (currentPeriodEnd) {
      updateSet.currentPeriodEnd = currentPeriodEnd;
    } else if (!existing) {
      // The field is required and this is an insert, so something has to go in
      // it. Thirty days matches Shopify's default EVERY_30_DAYS interval, and
      // the log says the date is a local guess rather than Shopify's answer.
      updateSet.currentPeriodEnd = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      );
      this.logger.warn(
        `[BillingService] Shopify reported no currentPeriodEnd for charge ${chargeId}; storing a 30-day estimate for business ${businessId}.`,
      );
    }

    const sub = await this.subscriptionModel
      .findOneAndUpdate(
        { businessId: businessId as any },
        {
          $set: updateSet,
          // Only on creation: an existing subscription's period start belongs
          // to the period it started, not to the latest callback.
          $setOnInsert: { currentPeriodStart: new Date() },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();

    if (isApproved) {
      await this.businessModel
        .findByIdAndUpdate(businessId, {
          $set: { status: 'active' },
        })
        .exec();
    }

    // The guard caches its decision, so the merchant would otherwise wait out
    // the TTL after paying.
    await this.entitlementService.invalidate(businessId);

    this.logger.log(
      `[BillingService] Updated Shopify subscription for business ${businessId}: charge ${chargeId}, status ${subStatus}`,
    );

    return sub;
  }

  /**
   * Applies a Shopify-reported AppSubscription state to the ORA subscription.
   *
   * This is the only path that can ever learn about a cancellation, a decline,
   * an expiry or a frozen charge: the billing callback runs once, at approval
   * time, and Shopify never calls it again. Without this, a merchant who
   * cancels in Shopify Admin keeps an ACTIVE ORA subscription indefinitely.
   *
   * Shopify owns the status vocabulary here, so the mapping is explicit rather
   * than a truthiness check on 'ACTIVE'.
   */
  async applyShopifySubscriptionState(
    businessId: string,
    chargeId: string,
    shopifyStatus: string,
  ) {
    const normalized = (shopifyStatus || '').toUpperCase();

    // PENDING means the merchant has not answered the approval screen yet.
    // Nothing has been decided, so nothing is changed.
    if (normalized === 'PENDING') {
      this.logger.log(
        `[BillingService] Shopify subscription ${chargeId} for business ${businessId} is PENDING; no state applied.`,
      );
      return null;
    }

    const SUBSCRIPTION_STATE: Record<
      string,
      { status: SubscriptionStatus; businessStatus: 'active' | 'suspended' }
    > = {
      ACTIVE: { status: SubscriptionStatus.ACTIVE, businessStatus: 'active' },
      FROZEN: { status: SubscriptionStatus.SUSPENDED, businessStatus: 'suspended' },
      CANCELLED: { status: SubscriptionStatus.CANCELED, businessStatus: 'suspended' },
      EXPIRED: { status: SubscriptionStatus.CANCELED, businessStatus: 'suspended' },
      DECLINED: { status: SubscriptionStatus.CANCELED, businessStatus: 'suspended' },
    };

    const mapped = SUBSCRIPTION_STATE[normalized];
    if (!mapped) {
      this.logger.warn(
        `[BillingService] Unrecognized Shopify subscription status '${shopifyStatus}' for business ${businessId}; no state applied.`,
      );
      return null;
    }

    // The billing callback stores the numeric charge id from its query string,
    // while the webhook carries a GraphQL gid
    // (`gid://shopify/AppSubscription/123`). Reduce both to the numeric id, or
    // the two paths never match the same document.
    const providerRef = (chargeId || '').split('/').pop() || chargeId;

    // Scoped to the business AND the charge so a stale webhook for a replaced
    // subscription cannot overwrite the current one. No upsert: a state change
    // for a subscription ORA never recorded is a bug to see, not to create.
    const sub = await this.subscriptionModel
      .findOneAndUpdate(
        { businessId: businessId as any, providerRef },
        { $set: { status: mapped.status, billingProvider: BillingProvider.SHOPIFY } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!sub) {
      this.logger.warn(
        `[BillingService] No Shopify subscription matches charge ${chargeId} for business ${businessId}; state '${normalized}' not applied.`,
      );
      return null;
    }

    await this.businessModel
      .findByIdAndUpdate(businessId, {
        $set: { status: mapped.businessStatus },
      })
      .exec();

    await this.entitlementService.invalidate(businessId);

    this.logger.log(
      `[BillingService] Shopify subscription ${chargeId} for business ${businessId} is ${normalized}: subscription ${mapped.status}, business ${mapped.businessStatus}.`,
    );

    return sub;
  }
}


