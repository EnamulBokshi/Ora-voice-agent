import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';
import { AdminUser } from '../../users/schemas/admin-user.schema';

export type TrialLogDocument = TrialLog & Document;

@Schema({ timestamps: true })
export class TrialLog {
  /**
   * Normalized host or domain of the merchant (e.g. "boutique.com", "myshop.xyz").
   * Stripped of protocol (http/https), "www.", port, trailing slashes and paths.
   * Uniquely indexed so that no website can ever receive more than one 14-day free trial.
   */
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
  })
  normalizedDomain: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: AdminUser.name,
    required: true,
    index: true,
  })
  adminUserId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  })
  registeredEmail: string;

  @Prop({ type: String, trim: true })
  ipAddress?: string;

  @Prop({ default: Date.now })
  grantedAt: Date;

  @Prop({ required: true })
  trialExpiresAt: Date;
}

export const TrialLogSchema = SchemaFactory.createForClass(TrialLog);
TrialLogSchema.index({ normalizedDomain: 1 }, { unique: true });
