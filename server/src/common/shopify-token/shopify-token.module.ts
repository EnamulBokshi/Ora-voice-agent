import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { ShopifyTokenService } from './shopify-token.service';
import { Business, BusinessSchema } from '../../users/schemas/business.schema';

/**
 * Global for the same reason `EntitlementModule` is: the callers that need a
 * live Shopify token sit in `BillingModule` and `IngestionModule`, which
 * `ShopifyModule` already imports. Exporting this from `ShopifyModule` would
 * make both directions circular.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
    ]),
  ],
  providers: [ShopifyTokenService],
  exports: [ShopifyTokenService],
})
export class ShopifyTokenModule {}
