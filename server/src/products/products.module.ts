import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from './schemas/product.schema';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
