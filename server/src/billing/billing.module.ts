import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { PaymentTransaction, PaymentTransactionSchema } from './schemas/payment-transaction.schema';
import { AdminUser, AdminUserSchema } from '../users/schemas/admin-user.schema';
import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { StripeProvider } from './providers/stripe.provider';
import { BkashProvider } from './providers/bkash.provider';
import { ShopifyProvider } from './providers/shopify.provider';
import { BillingSchedulerService } from './services/billing-scheduler.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { AuthModule } from '../auth/auth.module';

import { TrialLog, TrialLogSchema } from './schemas/trial-log.schema';
import { KnowledgeBase, KnowledgeBaseSchema } from '../knowledge/schemas/knowledge-base.schema';

@Module({
  imports: [
    ConfigModule,
    InvoicesModule,
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: Business.name, schema: BusinessSchema },
      { name: TrialLog.name, schema: TrialLogSchema },
      { name: KnowledgeBase.name, schema: KnowledgeBaseSchema },
    ]),
  ],
  controllers: [BillingController],
  providers: [
    BillingService,
    StripeProvider,
    BkashProvider,
    ShopifyProvider,
    BillingSchedulerService,
  ],
  exports: [
    BillingService,
    StripeProvider,
    BkashProvider,
    ShopifyProvider,
    BillingSchedulerService,
    MongooseModule,
  ],
})
export class BillingModule {}
