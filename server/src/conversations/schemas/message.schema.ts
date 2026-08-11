import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Conversation } from './conversation.schema';

export type MessageDocument = Message & Document;

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Conversation.name,
    required: true,
    index: true,
  })
  conversationId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MessageRole),
    required: true,
  })
  role: MessageRole;

  @Prop({ required: true })
  content: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  toolCall?: Record<string, any>;

  @Prop({ default: Date.now, index: true })
  timestamp: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, timestamp: 1 });
