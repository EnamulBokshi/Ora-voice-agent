import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InvoiceCounterDocument = InvoiceCounter & Document;

@Schema({ timestamps: true })
export class InvoiceCounter {
  @Prop({ required: true, unique: true, default: 'invoice' })
  counterId: string;

  @Prop({ type: Number, required: true, default: 100 })
  seq: number;
}

export const InvoiceCounterSchema = SchemaFactory.createForClass(InvoiceCounter);
