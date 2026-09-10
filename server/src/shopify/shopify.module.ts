import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';

import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { ShopifyComplianceService } from './shopify-compliance.service';
import { ShopifySyncProcessor } from './shopify-sync.processor';
import { SHOPIFY_SYNC_QUEUE } from './shopify.constants';

import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { BillingModule } from '../billing/billing.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { ProductsModule } from '../products/products.module';
import { VectorModule } from '../vector/vector.module';

import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { AdminUser, AdminUserSchema } from '../users/schemas/admin-user.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  Conversation,
  ConversationSchema,
} from '../conversations/schemas/conversation.schema';
import { Message, MessageSchema } from '../conversations/schemas/message.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import {
  KnowledgeBase,
  KnowledgeBaseSchema,
} from '../knowledge/schemas/knowledge-base.schema';
import {
  KnowledgeChunk,
  KnowledgeChunkSchema,
} from '../knowledge/schemas/knowledge-chunk.schema';
import {
  VectorIndex,
  VectorIndexSchema,
} from '../vector/schemas/vector-index.schema';

/**
 * Shopify embedded app: install, session exchange, billing, and the compliance
 * webhooks.
 *
 * Catalog webhooks are deliberately absent — `IngestionController` already
 * receives them, verifies the HMAC, dedupes on webhook id, and resolves the
 * tenant from the signed shop domain. This module registers Shopify to point at
 * that route rather than standing up a second receiver.
 */
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule),
    UsersModule,
    BillingModule,
    IngestionModule,
    ProductsModule,
    VectorModule,
    BullModule.registerQueue({
      name: SHOPIFY_SYNC_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: KnowledgeBase.name, schema: KnowledgeBaseSchema },
      { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
      { name: VectorIndex.name, schema: VectorIndexSchema },
    ]),
  ],
  controllers: [ShopifyController],
  providers: [ShopifyService, ShopifyComplianceService, ShopifySyncProcessor],
  exports: [ShopifyService],
})
export class ShopifyModule {}
