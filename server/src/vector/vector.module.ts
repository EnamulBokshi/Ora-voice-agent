import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import { VectorIndex, VectorIndexSchema } from './schemas/vector-index.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: VectorIndex.name, schema: VectorIndexSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [EmbeddingService, VectorStoreService],
  exports: [EmbeddingService, VectorStoreService, MongooseModule],
})
export class VectorModule {}
