import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { EntitlementService } from './entitlement.service';
import { Business, BusinessSchema } from '../../users/schemas/business.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../../billing/schemas/subscription.schema';

/**
 * Global so that `SubscriptionGuard` can be used in any feature module without
 * that module registering the Business and Subscription schemas. Sixteen
 * controllers apply the tenant guards; requiring each of their modules to
 * register two more schemas is how a guard ends up silently omitted.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [EntitlementService],
  exports: [EntitlementService],
})
export class EntitlementModule {}
