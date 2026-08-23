import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeBase, KnowledgeBaseSchema } from './schemas/knowledge-base.schema';
import { KnowledgeChunk, KnowledgeChunkSchema } from './schemas/knowledge-chunk.schema';
import { VectorModule } from '../vector/vector.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    VectorModule,
    RedisModule,
    MongooseModule.forFeature([
      { name: KnowledgeBase.name, schema: KnowledgeBaseSchema },
      { name: KnowledgeChunk.name, schema: KnowledgeChunkSchema },
    ]),
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService, MongooseModule],
})
export class KnowledgeModule {}
