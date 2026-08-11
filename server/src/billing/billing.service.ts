import { Injectable, OnModuleInit, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { DomainException } from '../common/exceptions/domain.exception';

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
    private readonly stripeProvider: StripeProvider,
    private readonly bkashProvider: BkashProvider,
    private readonly invoicesService: InvoicesService,
    private readonly redisService: RedisService,
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

    const [mins, orders] = await Promise.all([
      redisClient.get(`usage:${businessId}:${currentPeriod}:conversationMinutes`),
      redisClient.get(`usage:${businessId}:${currentPeriod}:ordersPerMonth`),
    ]);

    return {
      subscription: sub,
      plan,
      usage: {
        conversationMinutes: mins ? parseInt(mins, 10) : 0,
        ordersPerMonth: orders ? parseInt(orders, 10) : 0,
      },
    };
  }

  async subscribe(businessId: string, dto: SubscribeDto) {
    const plan = await this.planModel.findOne({ planId: dto.planId }).exec();
    if (!plan) {
      throw new DomainException(
        'PLAN_NOT_FOUND',
        `Plan '${dto.planId}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const provider =
      dto.billingProvider === BillingProvider.BKASH
        ? this.bkashProvider
        : this.stripeProvider;

    // Create subscription via Provider Abstraction
    const subRef = await provider.createSubscription(businessId, dto.planId);

    const bId = businessId as any;
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const sub = await this.subscriptionModel.findOneAndUpdate(
      { businessId: bId },
      {
        $set: {
          planId: dto.planId,
          billingProvider: dto.billingProvider || BillingProvider.STRIPE,
          providerRef: subRef.providerRef,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      },
      { upsert: true, new: true },
    ).exec();

    // Record append-only PaymentTransaction
    const transaction = await new this.transactionModel({
      businessId: bId,
      subscriptionId: sub._id as any,
      billingProvider: dto.billingProvider || BillingProvider.STRIPE,
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

    return {
      subscription: sub,
      transaction,
      invoice,
    };
  }

  async cancelSubscription(businessId: string) {
    const sub = await this.subscriptionModel
      .findOneAndUpdate(
        { businessId: businessId as any },
        { $set: { cancelAtPeriodEnd: true } },
        { new: true },
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
    if (count > 0) return;

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
        isActive: true,
      },
    ];

    await this.planModel.insertMany(defaultPlans);
  }
}
