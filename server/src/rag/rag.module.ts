import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { RagController } from './rag.controller';
import { RagService } from './services/rag.service';
import { VectorModule } from '../vector/vector.module';
import { ProductsModule } from '../products/products.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { EventsModule } from '../events/events.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { Business, BusinessSchema } from '../users/schemas/business.schema';

@Module({
  imports: [
    ConfigModule,
    VectorModule,
    ProductsModule,
    KnowledgeModule,
    EventsModule,
    IngestionModule,
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
    ]),
  ],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}

