import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

export type EventDocument = Event & Document;

export enum EventType {
  RAG_FALLBACK_TRIGGERED = 'rag_fallback_triggered',
  PRODUCT_RECOMMENDED = 'product_recommended',
  ORDER_PLACED = 'order_placed',
  CART_UPDATED = 'cart_updated',
  AUTHORITY_ESCALATION_FLAGGED = 'authority_escalation_flagged',
  INVENTORY_WARNING = 'inventory_warning',
}

@Schema({ timestamps: true })
export class Event {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(EventType),
    required: true,
    index: true,
  })
  eventType: EventType;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload: Record<string, any>;

  @Prop({ trim: true, index: true })
  correlationId?: string;

  @Prop({ default: Date.now, index: true })
  timestamp: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ businessId: 1, eventType: 1, timestamp: -1 });
