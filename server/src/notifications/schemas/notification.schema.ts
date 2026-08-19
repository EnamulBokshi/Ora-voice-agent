import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationCategory {
  SALES = 'sales',
  SYNC = 'sync',
  SYSTEM = 'system',
}

export enum NotificationSeverity {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Business', required: true, index: true })
  businessId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationCategory),
    default: NotificationCategory.SYSTEM,
    index: true,
  })
  category: NotificationCategory;

  @Prop({
    type: String,
    enum: Object.values(NotificationSeverity),
    default: NotificationSeverity.INFO,
  })
  severity: NotificationSeverity;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ businessId: 1, createdAt: -1 });
NotificationSchema.index({ businessId: 1, read: 1 });
NotificationSchema.index({ businessId: 1, category: 1 });
