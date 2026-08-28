import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TokenUsageRecord,
  TokenUsageRecordSchema,
} from './schemas/token-usage-record.schema';
import {
  DailyUsageSummary,
  DailyUsageSummarySchema,
} from './schemas/daily-usage-summary.schema';
import { Business, BusinessSchema } from '../users/schemas/business.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../billing/schemas/subscription.schema';
import { Plan, PlanSchema } from '../billing/schemas/plan.schema';
import { CostCalculatorService } from './cost-calculator.service';
import { UsageTrackingService } from './usage-tracking.service';
import { RedisModule } from '../common/redis/redis.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TokenUsageRecord.name, schema: TokenUsageRecordSchema },
      { name: DailyUsageSummary.name, schema: DailyUsageSummarySchema },
      { name: Business.name, schema: BusinessSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Plan.name, schema: PlanSchema },
    ]),
    RedisModule,
  ],
  providers: [CostCalculatorService, UsageTrackingService],
  exports: [CostCalculatorService, UsageTrackingService],
})
export class UsageModule {}
