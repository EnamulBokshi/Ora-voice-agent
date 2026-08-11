import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessDocument = Business & Document;

@Schema({ timestamps: true })
export class Business {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  domain?: string;

  @Prop({ required: true, unique: true, index: true })
  publishableKey: string;

  @Prop()
  apiKeyHash?: string;

  @Prop({ default: 'active', enum: ['active', 'suspended', 'pending'] })
  status: string;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);
