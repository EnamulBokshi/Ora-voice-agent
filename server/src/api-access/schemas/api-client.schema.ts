import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Business } from '../../users/schemas/business.schema';

/**
 * OAuth 2.0 scopes available to machine clients.
 * Kept deliberately narrow: a client may submit user input and read back
 * only what it submitted. Dashboard-grade reads stay on the JWT session path.
 */
export enum ApiScope {
  INPUTS_WRITE = 'inputs:write',
  INPUTS_READ = 'inputs:read',
  PRODUCTS_WRITE = 'products:write',
  PRODUCTS_READ = 'products:read',
}

export enum ApiClientStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
}

@Schema({ timestamps: true })
export class ApiClient {
  /**
   * Tenant this client acts for. This is the single source of truth for
   * tenant resolution on every request the client makes -- a businessId in a
   * request body or header is never trusted.
   */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Business.name,
    required: true,
    index: true,
  })
  businessId: MongooseSchema.Types.ObjectId;

  /** Human label so a merchant can tell their integrations apart. */
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  clientId: string;

  /**
   * bcrypt hash of the client secret. The plaintext secret is returned exactly
   * once, at creation time, and is not recoverable afterwards.
   */
  @Prop({ required: true })
  clientSecretHash: string;

  /** Last 4 chars of the secret, so the merchant can identify it in the UI. */
  @Prop()
  secretHint?: string;

  @Prop({
    type: [String],
    enum: Object.values(ApiScope),
    default: [ApiScope.INPUTS_WRITE],
  })
  scopes: ApiScope[];

  @Prop({
    type: String,
    enum: Object.values(ApiClientStatus),
    default: ApiClientStatus.ACTIVE,
    index: true,
  })
  status: ApiClientStatus;

  /**
   * Optional egress IP allowlist. When non-empty, token issuance is refused
   * from any other address. Leave empty for callers without a static IP.
   */
  @Prop({ type: [String], default: [] })
  allowedIps: string[];

  @Prop()
  lastUsedAt?: Date;

  @Prop()
  createdBy?: string;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedBy?: string;
}

export type ApiClientDocument = ApiClient & Document;
export const ApiClientSchema = SchemaFactory.createForClass(ApiClient);

ApiClientSchema.index({ businessId: 1, status: 1 });
