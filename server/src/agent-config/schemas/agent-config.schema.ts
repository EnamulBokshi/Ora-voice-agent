import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import {
  BUSINESS_ARCHETYPES,
  DEFAULT_ARCHETYPE,
} from '../../common/constants/archetypes';

/**
 * Every document in this file is keyed on (businessId, archetype), not on
 * businessId alone: a business owns one agent profile per archetype and
 * `Business.activeArchetype` selects which one is live. Switching archetypes
 * therefore reads a different profile — a blank one on first visit — while the
 * previous profile stays on disk untouched.
 */
const archetypeProp = {
  type: String,
  enum: BUSINESS_ARCHETYPES,
  default: DEFAULT_ARCHETYPE,
  required: true,
  index: true,
};

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

  /**
   * The archetype this profile belongs to. It identifies the profile rather
   * than describing it, so it is never edited in place — a merchant changes
   * archetype by switching profiles, not by writing a new value here.
   */
  @Prop(archetypeProp)
  archetype: string;

  @Prop({ type: String, default: '' })
  businessSummary: string;

  @Prop({ type: String, default: '' })
  customDirectives: string;

  @Prop({ type: String, default: '' })
  systemPrompt: string;

  @Prop({ type: String, default: '' })
  greetingMessage: string;

  @Prop({ type: String, default: '' })
  avoidances: string;

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
AgentConfigSchema.index({ businessId: 1, archetype: 1 }, { unique: true });

@Schema({ timestamps: true })
export class VoiceSettings {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop(archetypeProp)
  archetype: string;

  @Prop({ default: 'Aoede' })
  voiceId: string;

  @Prop({ default: 'en' })
  language: string;
}

export const VoiceSettingsSchema = SchemaFactory.createForClass(VoiceSettings);
VoiceSettingsSchema.index({ businessId: 1, archetype: 1 }, { unique: true });

@Schema({ timestamps: true })
export class SalesPlaybook {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop(archetypeProp)
  archetype: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  upsellCategories: Record<string, any>;

  @Prop({ default: true })
  mentionLowStockUrgency: boolean;
}

export const SalesPlaybookSchema = SchemaFactory.createForClass(SalesPlaybook);
SalesPlaybookSchema.index({ businessId: 1, archetype: 1 }, { unique: true });
