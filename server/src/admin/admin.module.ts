import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { AdminUser, AdminUserSchema } from '../users/schemas/admin-user.schema';
import { Conversation, ConversationSchema } from '../conversations/schemas/conversation.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
