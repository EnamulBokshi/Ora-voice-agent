import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

export type TokenUsageRecordDocument = TokenUsageRecord & Document;

export enum UsageChannelType {
  VOICE_STREAM = 'voice_stream',
  CHAT_TURN = 'chat_turn',
  RAG_EMBEDDING = 'rag_embedding',
  TOOL_EXECUTION = 'tool_execution',
}

@Schema({ timestamps: true })
export class TokenUsageRecord {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  sessionId: string;

  @Prop({
    type: String,
    enum: Object.values(UsageChannelType),
    default: UsageChannelType.VOICE_STREAM,
    required: true,
  })
  channelType: UsageChannelType;

  @Prop({ type: String, default: 'gemini-2.0-flash' })
  aiModel: string;

  // LLM Tokens
  @Prop({ type: Number, default: 0 })
  promptTokens: number;

  @Prop({ type: Number, default: 0 })
  completionTokens: number;

  @Prop({ type: Number, default: 0 })
  cachedTokens: number;

  // Voice Telemetry (in seconds)
  @Prop({ type: Number, default: 0 })
  audioInputSeconds: number;

  @Prop({ type: Number, default: 0 })
  audioOutputSeconds: number;

  // Computed Financial Cost (USD with micro-cent precision)
  @Prop({ type: Number, required: true, default: 0 })
  estimatedCostUsd: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;
}

export const TokenUsageRecordSchema = SchemaFactory.createForClass(TokenUsageRecord);

TokenUsageRecordSchema.index({ businessId: 1, createdAt: -1 });
TokenUsageRecordSchema.index({ createdAt: -1 });
