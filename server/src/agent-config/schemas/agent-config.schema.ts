import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

export type AgentConfigDocument = AgentConfig & Document;
export type VoiceSettingsDocument = VoiceSettings & Document;
export type SalesPlaybookDocument = SalesPlaybook & Document;

@Schema({ timestamps: true })
export class AgentConfig {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({ default: 'Helpful, professional, and friendly sales assistant.' })
  brandVoiceDescription: string;

  @Prop({
    type: String,
    enum: ['portfolio', 'agency_services', 'saas', 'ecommerce', 'clinic_appointments', 'consulting', 'general'],
    default: 'general',
  })
  businessArchetype: string;

  @Prop({ type: String, default: '' })
  businessSummary: string;

  @Prop({ type: String, default: '' })
  customDirectives: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ type: Number, default: 10 })
  idleTimeoutSeconds: number;

  @Prop({ type: Number, default: 10 })
  discountFloorPercent: number;

  @Prop({ type: [String], default: [] })
  alwaysOfferProductIds: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const AgentConfigSchema = SchemaFactory.createForClass(AgentConfig);

@Schema({ timestamps: true })
export class VoiceSettings {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({ default: 'Aoede' })
  voiceId: string;

  @Prop({ default: 'en' })
  language: string;
}

export const VoiceSettingsSchema = SchemaFactory.createForClass(VoiceSettings);

@Schema({ timestamps: true })
export class SalesPlaybook {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  upsellCategories: Record<string, any>;

  @Prop({ default: true })
  mentionLowStockUrgency: boolean;
}

export const SalesPlaybookSchema = SchemaFactory.createForClass(SalesPlaybook);
