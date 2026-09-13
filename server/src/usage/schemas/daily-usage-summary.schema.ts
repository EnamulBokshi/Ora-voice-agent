import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

export type DailyUsageSummaryDocument = DailyUsageSummary & Document;

@Schema({ timestamps: true })
export class DailyUsageSummary {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({ type: String, required: true }) // YYYY-MM-DD
  date: string;

  @Prop({ type: Number, default: 0 })
  promptTokens: number;

  @Prop({ type: Number, default: 0 })
  completionTokens: number;

  @Prop({ type: Number, default: 0 })
  cachedTokens: number;

  @Prop({ type: Number, default: 0 })
  audioInputSeconds: number;

  @Prop({ type: Number, default: 0 })
  audioOutputSeconds: number;

  @Prop({ type: Number, default: 0 })
  sessionsCount: number;

  @Prop({ type: Number, default: 0 })
  totalCostUsd: number;
}

export const DailyUsageSummarySchema = SchemaFactory.createForClass(DailyUsageSummary);

DailyUsageSummarySchema.index({ businessId: 1, date: 1 }, { unique: true });
DailyUsageSummarySchema.index({ date: 1 });
