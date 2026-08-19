import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({

  imports: [
    ConfigModule,
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
    AgentConfigModule,
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

