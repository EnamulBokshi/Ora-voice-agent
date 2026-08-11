import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationGateway } from './conversation.gateway';
import { Business, BusinessSchema } from '../users/schemas/business.schema';
import { ConversationsModule } from '../conversations/conversations.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    ConversationsModule,
    RagModule,
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
    ]),
  ],
  providers: [ConversationGateway],
  exports: [ConversationGateway],
})
export class GatewayModule {}
