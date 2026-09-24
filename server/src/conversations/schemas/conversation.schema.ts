import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { Customer } from '../../customers/schemas/customer.schema';

export type ConversationDocument = Conversation & Document;

export enum ConversationChannel {
  WIDGET_CHAT = 'widget_chat',
  WIDGET_VOICE = 'widget_voice',
  API = 'api',
}

export enum ConversationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Customer.name,
    index: true,
  })
  customerId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ConversationChannel),
    default: ConversationChannel.WIDGET_CHAT,
  })
  channel: ConversationChannel;

  @Prop({
    type: String,
    enum: Object.values(ConversationStatus),
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Prop({ default: Date.now })
  lastActivityAt: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  /** Opened by the store's own staff to test or train ORA. Hidden from listings and analytics. */
  @Prop({ default: false })
  isTest: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ businessId: 1, status: 1 });
ConversationSchema.index({ businessId: 1, isTest: 1 });
