import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { GeminiVoiceService } from './gemini-voice.service';
import { AiToolsExecutor } from './tools/ai-tools.executor';
import { VoiceSessionController } from './voice-session.controller';
import { VoiceProxyGateway } from './voice-proxy.gateway';
import { BootstrapRateLimitGuard } from './guards/bootstrap-rate-limit.guard';
import { ProductsModule } from '../products/products.module';
import { RagModule } from '../rag/rag.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { RedisModule } from '../common/redis/redis.module';
import { EventsModule } from '../events/events.module';
import { AgentConfigModule } from '../agent-config/agent-config.module';
import { OrdersModule } from '../orders/orders.module';
import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { AdminUser, AdminUserSchema } from '../users/schemas/admin-user.schema';

import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { CustomersModule } from '../customers/customers.module';
import { BillingModule } from '../billing/billing.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    ConfigModule,
    BillingModule,
    ConversationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'ora-secret-key-change-in-prod',
      }),
    }),
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),

    ProductsModule,
    RagModule,
    KnowledgeModule,
    RedisModule,
    EventsModule,
    forwardRef(() => AgentConfigModule),
    OrdersModule,
    CustomersModule,
  ],
  controllers: [VoiceSessionController],

  providers: [
    GeminiVoiceService,
    AiToolsExecutor,
    VoiceProxyGateway,
    BootstrapRateLimitGuard,
  ],
  exports: [GeminiVoiceService, AiToolsExecutor, VoiceProxyGateway],
})
export class AiVoiceModule {}

