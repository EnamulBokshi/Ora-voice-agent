import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LiveDeskController } from './live-desk.controller';
import { LiveDeskService } from './live-desk.service';
import {
  Conversation,
  ConversationSchema,
} from '../conversations/schemas/conversation.schema';
import { Message, MessageSchema } from '../conversations/schemas/message.schema';
import { Event, EventSchema } from '../events/schemas/event.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Event.name, schema: EventSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    RedisModule,
  ],
  controllers: [LiveDeskController],
  providers: [LiveDeskService],
  exports: [LiveDeskService],
})
export class LiveDeskModule {}
