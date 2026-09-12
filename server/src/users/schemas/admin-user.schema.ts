import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { AdminRole } from '../enums/admin-role.enum';
import { Business } from './business.schema';

export type AdminUserDocument = AdminUser & Document;

@Schema({ timestamps: true })
export class AdminUser {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(AdminRole),
    default: AdminRole.USER,
  })
  role: AdminRole;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  pendingOtpHash?: string;

  @Prop()
  otpExpiresAt?: Date;

  @Prop({ default: 0 })
  otpAttemptCount: number;

  @Prop({ index: true, sparse: true })
  resetPasswordTokenHash?: string;

  @Prop()
  resetPasswordExpiresAt?: Date;

  /**
   * The Shopify staff member this account belongs to — the `sub` claim of the
   * App Bridge session token.
   *
   * This is what makes an embedded session belong to a person rather than to a
   * store. Without it every staff member who opened the app was handed the
   * tenant's oldest account, which is always the OWNER, so a junior staffer
   * could rotate the secret API key and change the plan.
   *
   * Absent on web signups and on the owner record created at install, which is
   * linked to its staff id the first time the account owner opens the app.
   */
  @Prop({ trim: true })
  shopifyStaffUserId?: string;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);

/**
 * One account per staff member per tenant. Shopify staff ids are unique within
 * a shop but not across shops, so the tenant has to be part of the key.
 */
AdminUserSchema.index(
  { businessId: 1, shopifyStaffUserId: 1 },
  { unique: true, sparse: true },
);
