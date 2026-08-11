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
    default: AdminRole.OWNER,
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
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);
