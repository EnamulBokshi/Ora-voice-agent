import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BUSINESS_ARCHETYPES, DEFAULT_ARCHETYPE } from '../../common/constants/archetypes';

export type BusinessDocument = Business & Document;

@Schema({ timestamps: true })
export class Business {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  domain?: string;

  /** Normalized merchant website domain (e.g. "boutique.com") for anti-abuse tracking */
  @Prop({ trim: true, lowercase: true, index: true })
  normalizedDomain?: string;

  @Prop()
  trialGrantedAt?: Date;

  @Prop()
  trialExpiresAt?: Date;

  @Prop({ type: String, unique: true, sparse: true, index: true, required: false })
  publishableKey?: string | null;

  /**
   * @deprecated Legacy plaintext secret key, kept only so a key issued before
   * hashing was introduced still authenticates once, at which point it is
   * migrated to `secretApiKeyHash` and cleared. Hidden from queries by
   * default; `scripts/migrate-hash-secret-keys.ts` empties the field.
   */
  @Prop({
    type: String,
    unique: true,
    sparse: true,
    index: true,
    required: false,
    select: false,
  })
  secretApiKey?: string | null;

  /** SHA-256 of the secret API key. The plaintext is shown once, at creation. */
  @Prop({ type: String, unique: true, sparse: true, index: true, required: false })
  secretApiKeyHash?: string | null;

  /** Last 4 characters of the secret key, so the merchant can identify it. */
  @Prop({ type: String, required: false })
  secretApiKeyHint?: string | null;

  @Prop({
    type: String,
    enum: ['active', 'suspended', 'revoked', 'none'],
    default: 'active',
  })
  keyStatus?: string;

  /**
   * Merchant-level storefront widget visibility toggle.
   * When false, the widget does not mount or run on the merchant's business site.
   */
  @Prop({ type: Boolean, default: true })
  isWidgetActive: boolean;

  /**
   * Detected web origins and referrers using this publishable key.
   * Used for multi-site leak detection and domain mismatch telemetry.
   */
  @Prop({
    type: [
      {
        origin: { type: String, required: true },
        domain: { type: String, required: true },
        lastSeen: { type: Date, default: Date.now },
        sessionCount: { type: Number, default: 1 },
        isMismatch: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  detectedOrigins?: Array<{
    origin: string;
    domain: string;
    lastSeen: Date;
    sessionCount: number;
    isMismatch: boolean;
  }>;

  @Prop()
  keyRevokedAt?: Date;

  @Prop()
  keyRevokedBy?: string;

  @Prop()
  apiKeyHash?: string;

  @Prop({ select: false })
  apiSecretHash?: string;

  @Prop({ default: 'pending', enum: ['active', 'suspended', 'pending'] })
  status: string;

  /**
   * The agent profile currently serving traffic.
   *
   * Archetype is an entity: the business owns one AgentConfig, VoiceSettings,
   * SalesPlaybook and knowledge set per archetype, and this field says which
   * one is live. Changing it swaps the whole profile — the previous one stays
   * on disk untouched and is restored by switching back.
   */
  @Prop({
    type: String,
    enum: BUSINESS_ARCHETYPES,
    default: DEFAULT_ARCHETYPE,
    index: true,
  })
  activeArchetype: string;

  /**
   * Which platform the merchant's product catalog is connected to.
   * Used by the RAG Gap B live fallback to determine which connector to call.
   */
  @Prop({
    type: String,
    enum: ['shopify', 'woocommerce', 'feed', 'passive', 'manual', 'none'],
    default: 'none',
  })
  connectedPlatform: string;

  // --- Tier 1: Shopify Connector ---
  @Prop({ trim: true })
  shopifyStoreUrl?: string;

  /**
   * Shopify Admin API access token, encrypted with EncryptionUtil. Read it
   * through `BusinessCredentials.shopifyAccessToken()`, which also accepts a
   * value written before encryption was introduced.
   */
  @Prop({ trim: true, select: false })
  shopifyAccessToken?: string;

  /**
   * Normalized Shopify shop domain (`store.myshopify.com`), the unique key an
   * embedded-app install upserts on. `shopifyStoreUrl` above is the legacy,
   * unindexed field and is kept for tenants provisioned before the embedded
   * app existed.
   */
  @Prop({
    type: String,
    unique: true,
    sparse: true,
    index: true,
    trim: true,
    lowercase: true,
    required: false,
  })
  shopifyShopDomain?: string | null;

  /** Shop owner address from Shopify, used for billing and invoice delivery. */
  @Prop({ trim: true })
  shopifyOwnerEmail?: string;

  @Prop()
  shopifyInstalledAt?: Date;

  @Prop()
  shopifyUninstalledAt?: Date;

  /**
   * Access scopes Shopify granted at the last token exchange. Compared on each
   * session exchange so a scope change triggers a fresh exchange.
   */
  @Prop({ type: [String], default: [] })
  shopifyScopes?: string[];

  /**
   * Refresh token for an expiring offline access token, encrypted at rest like
   * `shopifyAccessToken`. Shopify rotates it on every refresh, so the value
   * written by the last refresh is the only one worth keeping.
   */
  @Prop({ trim: true, select: false })
  shopifyRefreshToken?: string;

  /**
   * When `shopifyAccessToken` stops working. Expiring offline tokens last
   * about 60 minutes, so background jobs must refresh before calling the Admin
   * API rather than assuming a stored token is live. Absent on legacy
   * non-expiring (`shpua_`) tokens.
   */
  @Prop()
  shopifyTokenExpiresAt?: Date;

  /**
   * When `shopifyRefreshToken` stops working — 90 days from issue, and shorter
   * once used. Past this point only a merchant-initiated install can restore
   * Admin API access.
   */
  @Prop()
  shopifyRefreshTokenExpiresAt?: Date;

  /**
   * The publishable key last written into the store's app-owned metafield,
   * which is where the theme app extension reads it from.
   *
   * Stored so the session exchange — which runs on every embedded page load —
   * can tell in one field comparison whether the metafield is current, instead
   * of spending an Admin API round trip per page load. A rotated key leaves
   * this stale, which is the signal to write again.
   */
  @Prop({ trim: true })
  shopifyStorefrontKeySyncedValue?: string;

  // --- Tier 1: WooCommerce Connector ---
  @Prop({ trim: true })
  woocommerceStoreUrl?: string;

  @Prop({ trim: true, select: false })
  woocommerceConsumerKey?: string;

  /** Encrypted at rest, like `shopifyAccessToken`. */
  @Prop({ trim: true, select: false })
  woocommerceConsumerSecret?: string;

  /**
   * Per-store WooCommerce webhook secret, encrypted at rest. A merchant sets
   * this string in their own store, so each tenant can have its own. Falls
   * back to WOOCOMMERCE_WEBHOOK_SECRET when unset.
   */
  @Prop({ trim: true, select: false })
  woocommerceWebhookSecret?: string;

  // --- Tier 4: Manual Endpoint Connector ---
  @Prop({ trim: true })
  manualEndpointUrl?: string;

  @Prop({
    type: String,
    enum: ['id_lookup', 'search_only'],
    default: 'search_only',
  })
  manualEndpointMode?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  manualEndpointHeaders?: Record<string, string>;

  /**
   * Monthly AI Token/Voice cost budget limit in USD (optional guardrail).
   * Null or 0 means unlimited/plan-default.
   */
  @Prop({ type: Number, default: null })
  monthlyAiBudgetUsd?: number | null;

  /**
   * Maximum allowed voice/chat session duration in seconds per customer session.
   * Null means use the platform-wide default (DEFAULT_SESSION_DURATION_SECONDS env var, defaults to 300s).
   * Set by SuperAdmin on a per-merchant basis. Range: 60–3600 seconds.
   */
  @Prop({ type: Number, default: null })
  maxSessionDurationSeconds?: number | null;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);

