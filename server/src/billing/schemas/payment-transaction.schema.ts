import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { Subscription } from './subscription.schema';
import { BillingProvider } from './subscription.schema';

export type PaymentTransactionDocument = PaymentTransaction & Document;

export enum TransactionStatus {
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Schema({ timestamps: true })
export class PaymentTransaction {
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

  @Prop({ type: String, enum: Object.values(BillingProvider), required: true })
  billingProvider: BillingProvider;

  @Prop({ required: true, trim: true })
  providerTransactionId: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ required: true, trim: true, default: 'USD' })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.SUCCEEDED,
  })
  status: TransactionStatus;

  @Prop({ default: Date.now })
  billingPeriodStart: Date;
}

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);
