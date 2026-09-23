import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { AdminUser, AdminUserSchema } from '../users/schemas/admin-user.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Subscription, SubscriptionSchema } from '../billing/schemas/subscription.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { AgentConfig, AgentConfigSchema } from '../agent-config/schemas/agent-config.schema';
import { Plan, PlanSchema } from '../billing/schemas/plan.schema';
import { TrialLog, TrialLogSchema } from '../billing/schemas/trial-log.schema';
import { Coupon, CouponSchema } from '../billing/schemas/coupon.schema';
import {
  EmailCampaign,
  EmailCampaignSchema,
} from './schemas/email-campaign.schema';
import { EmailCampaignService } from './services/email-campaign.service';
import { MarketingController } from './marketing.controller';
import {
  DailyUsageSummary,
  DailyUsageSummarySchema,
} from '../usage/schemas/daily-usage-summary.schema';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    BillingModule,
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: AgentConfig.name, schema: AgentConfigSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: TrialLog.name, schema: TrialLogSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: EmailCampaign.name, schema: EmailCampaignSchema },
      { name: DailyUsageSummary.name, schema: DailyUsageSummarySchema },
    ]),
  ],
  controllers: [AdminController, MarketingController],
  providers: [AdminService, EmailCampaignService],
  exports: [AdminService, EmailCampaignService],
})
export class AdminModule {}

