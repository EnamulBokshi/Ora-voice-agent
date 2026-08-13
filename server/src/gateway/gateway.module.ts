import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationGateway } from './conversation.gateway';
import { VoiceGateway } from './voice.gateway';
import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { ConversationsModule } from '../conversations/conversations.module';
import { RagModule } from '../rag/rag.module';
import { AiVoiceModule } from '../ai-voice/ai-voice.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    ConversationsModule,
    RagModule,
    AiVoiceModule,
    RedisModule,
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
    ]),
  ],
  providers: [ConversationGateway, VoiceGateway],
  exports: [ConversationGateway, VoiceGateway],
})
export class GatewayModule {}

