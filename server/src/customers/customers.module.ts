import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer, CustomerSchema } from './schemas/customer.schema';

import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Business.name, schema: BusinessSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}

