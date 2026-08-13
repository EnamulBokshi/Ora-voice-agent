import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { RagController } from './rag.controller';
import { RagService } from './services/rag.service';
import { EmbeddingService } from './services/embedding.service';
import { VectorStoreService } from './services/vector-store.service';
import { VectorIndex, VectorIndexSchema } from './schemas/vector-index.schema';
import { ProductsModule } from '../products/products.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { EventsModule } from '../events/events.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { Business, BusinessSchema } from '../users/schemas/business.schema';

@Module({
  imports: [
    ConfigModule,
    ProductsModule,
    KnowledgeModule,
    EventsModule,
    IngestionModule,
    MongooseModule.forFeature([
      { name: VectorIndex.name, schema: VectorIndexSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
  ],
  controllers: [RagController],
  providers: [RagService, EmbeddingService, VectorStoreService],
  exports: [RagService, EmbeddingService, VectorStoreService],
})
export class RagModule {}

