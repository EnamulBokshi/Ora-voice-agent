import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Invoice } from './invoice.schema';

export type InvoiceDeliveryLogDocument = InvoiceDeliveryLog & Document;

@Schema({ timestamps: true })
export class InvoiceDeliveryLog {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Invoice.name,
    required: true,
    index: true,
  })
  invoiceId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, required: true })
  attemptNumber: number;

  @Prop({ required: true, enum: ['auto', 'manual-resend'], default: 'auto' })
  trigger: string;

  @Prop({ required: true, enum: ['succeeded', 'failed'], default: 'succeeded' })
  status: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  providerResponse: Record<string, any>;
}

export const InvoiceDeliveryLogSchema = SchemaFactory.createForClass(InvoiceDeliveryLog);
