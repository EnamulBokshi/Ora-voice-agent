import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { RagModule } from './rag/rag.module';
import { CustomersModule } from './customers/customers.module';
import { AgentConfigModule } from './agent-config/agent-config.module';
import { ConversationsModule } from './conversations/conversations.module';
import { GatewayModule } from './gateway/gateway.module';
import { BillingModule } from './billing/billing.module';
import { InvoicesModule } from './invoices/invoices.module';
import { EventsModule } from './events/events.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { OrdersModule } from './orders/orders.module';
import { AiVoiceModule } from './ai-voice/ai-voice.module';
import { RedisModule } from './common/redis/redis.module';
import { EntitlementModule } from './common/entitlement/entitlement.module';
import { ShopifyTokenModule } from './common/shopify-token/shopify-token.module';
import { MailModule } from './mail/mail.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

import { DashboardModule } from './dashboard/dashboard.module';
import { LiveDeskModule } from './live-desk/live-desk.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsageModule } from './usage/usage.module';
import { ApiAccessModule } from './api-access/api-access.module';
import { ShopifyModule } from './shopify/shopify.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/ora',
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: Number(configService.get<number>('REDIS_PORT')) || 6379,
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    RedisModule,
    // Global: SubscriptionGuard injects EntitlementService from feature
    // modules that register neither the Business nor the Subscription schema.
    EntitlementModule,
    ShopifyTokenModule,
    MailModule,
    EventsModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    KnowledgeModule,
    RagModule,
    CustomersModule,
    AgentConfigModule,
    ConversationsModule,
    GatewayModule,
    BillingModule,
    InvoicesModule,
    IngestionModule,
    OrdersModule,
    AiVoiceModule,
    DashboardModule,
    LiveDeskModule,
    AdminModule,
    NotificationsModule,
    UsageModule,
    ApiAccessModule,
    ShopifyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
