import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AdminUser } from '../../users/schemas/admin-user.schema';

export type EmailCampaignDocument = EmailCampaign & Document;

/**
 * A record of one promotional send.
 *
 * Bulk mail leaves the platform and cannot be recalled, so who sent what, to how
 * many people, and how it landed is kept permanently rather than inferred from logs.
 */
@Schema({ timestamps: true })
export class EmailCampaign {
  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  /** Coupon advertised in the body, if any. Stored for attribution. */
  @Prop({ type: String, default: null, uppercase: true, trim: true })
  couponCode: string | null;

  @Prop({ type: String, default: null, trim: true })
  ctaUrl: string | null;

  /** How the recipients were chosen: an explicit pick, or an audience filter. */
  @Prop({ required: true, trim: true })
  audience: string;

  @Prop({ type: Number, default: 0 })
  recipientCount: number;

  @Prop({ type: Number, default: 0 })
  deliveredCount: number;

  @Prop({ type: Number, default: 0 })
  failedCount: number;

  /** Recipients skipped because they had opted out of promotional email. */
  @Prop({ type: Number, default: 0 })
  skippedOptOutCount: number;

  /** Per-recipient outcome, so a failure can be chased to an address. */
  @Prop({ type: [Object], default: [] })
  results: Array<{
    businessId: string;
    email: string;
    delivered: boolean;
    reason?: string;
  }>;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: AdminUser.name,
    default: null,
  })
  sentBy: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: String, default: null, trim: true })
  sentByEmail: string | null;
}

export const EmailCampaignSchema = SchemaFactory.createForClass(EmailCampaign);
