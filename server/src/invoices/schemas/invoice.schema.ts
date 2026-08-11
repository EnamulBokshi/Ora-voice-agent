import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { Subscription } from '../../billing/schemas/subscription.schema';
import { PaymentTransaction } from '../../billing/schemas/payment-transaction.schema';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  GENERATED = 'generated',
  SENT = 'sent',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string; // Sequential: ORA-2026-000123

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Subscription.name,
    required: true,
  })
  subscriptionId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: PaymentTransaction.name,
    required: true,
  })
  transactionId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, required: true })
  amountUsdCents: number;

  @Prop({ type: Number, required: true })
  amountBdtPaisa: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ type: Number, default: 0 })
  taxAmount: number;

  @Prop({ required: true })
  pdfUrl: string;

  @Prop({
    type: String,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.GENERATED,
  })
  status: InvoiceStatus;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
