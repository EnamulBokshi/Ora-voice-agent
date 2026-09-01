import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PlanDocument = Plan & Document;

export enum PlanId {
  FREE = 'free',
  GROWTH = 'growth',
  SCALE = 'scale',
}

@Schema({ timestamps: true })
export class Plan {
  @Prop({
    type: String,
    required: true,
    unique: true,
    enum: Object.values(PlanId),
    index: true,
  })
  planId: PlanId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Number, required: true })
  priceUsdCents: number;

  @Prop({ type: Number, required: true })
  priceBdtPaisa: number;

  @Prop({ default: 'month', trim: true })
  billingInterval: string;

  @Prop({
    type: {
      conversationMinutes: { type: Number, default: 100 },
      ordersPerMonth: { type: Number, default: 20 },
      connectedStores: { type: Number, default: 1 },
      seats: { type: Number, default: 1 },
    },
    required: true,
  })
  limits: {
    conversationMinutes: number;
    ordersPerMonth: number;
    connectedStores: number;
    seats: number;
  };

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
