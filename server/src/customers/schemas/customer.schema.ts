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

  @Prop({ required: true, trim: true, default: 'Guest Shopper' })
  name: string;

  @Prop({ trim: true })
  emailEncrypted?: string;

  @Prop({ trim: true })
  phoneEncrypted?: string;

  @Prop({ type: Boolean, default: true, index: true })
  isAnonymous: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isMerged: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Customer',
    default: null,
    index: true,
  })
  mergedIntoCustomerId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, default: null })
  mergedAt?: Date;

  @Prop({ type: [String], default: [], index: true })
  deviceIds: string[];

  @Prop({ trim: true, index: true, sparse: true })
  externalCustomerId?: string;

  @Prop({ default: Date.now, index: true })
  lastActiveAt: Date;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  extractedPreferences: Record<string, any>;

  @Prop({ type: [String], default: [] })
  pastOrderIds: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ businessId: 1, name: 'text' });
CustomerSchema.index({ businessId: 1, deviceIds: 1 });
CustomerSchema.index({ businessId: 1, externalCustomerId: 1 });
CustomerSchema.index({ businessId: 1, isAnonymous: 1, lastActiveAt: 1 });

