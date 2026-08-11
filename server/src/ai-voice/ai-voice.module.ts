import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiVoiceService } from './gemini-voice.service';
import { AiToolsExecutor } from './tools/ai-tools.executor';
import { ProductsModule } from '../products/products.module';
import { RagModule } from '../rag/rag.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { RedisModule } from '../common/redis/redis.module';
import { EventsModule } from '../events/events.module';
import { AgentConfigModule } from '../agent-config/agent-config.module';

@Module({
  imports: [
    ConfigModule,
    ProductsModule,
    RagModule,
    KnowledgeModule,
    RedisModule,
    EventsModule,
    AgentConfigModule,
  ],
  providers: [GeminiVoiceService, AiToolsExecutor],
  exports: [GeminiVoiceService, AiToolsExecutor],
})
export class AiVoiceModule {}
