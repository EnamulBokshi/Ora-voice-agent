import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  emailEncrypted?: string;

  @Prop({ trim: true })
  phoneEncrypted?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  extractedPreferences: Record<string, any>;

  @Prop({ type: [String], default: [] })
  pastOrderIds: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ businessId: 1, name: 'text' });
