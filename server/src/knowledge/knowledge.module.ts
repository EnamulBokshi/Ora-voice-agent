import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KnowledgeService } from './knowledge.service';
import { VoiceTranscriptStructurerService } from './voice-transcript-structurer.service';
import { KnowledgeBase, KnowledgeBaseSchema } from './schemas/knowledge-base.schema';
import { KnowledgeChunk, KnowledgeChunkSchema } from './schemas/knowledge-chunk.schema';
import { Subscription, SubscriptionSchema } from '../billing/schemas/subscription.schema';
import { Plan, PlanSchema } from '../billing/schemas/plan.schema';
import { VectorModule } from '../vector/vector.module';
import { RedisModule } from '../common/redis/redis.module';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [
    VectorModule,
    RedisModule,
    MongooseModule.forFeature([
      { name: KnowledgeBase.name, schema: KnowledgeBaseSchema },
      { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Plan.name, schema: PlanSchema },
    ]),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, VoiceTranscriptStructurerService],
  exports: [KnowledgeService, MongooseModule],
})
export class KnowledgeModule {}
