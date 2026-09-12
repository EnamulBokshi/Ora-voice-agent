import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis/redis.service';
import { DomainException } from '../common/exceptions/domain.exception';
import { BusinessCredentialsUtil } from '../common/utils/business-credentials.util';
import { ShopifyOAuthError } from '../common/utils/shopify-oauth-error.util';
import { ShopifyTokenService } from '../common/shopify-token/shopify-token.service';
import { AdminRole } from '../users/enums/admin-role.enum';
import {
  Business,
  BusinessDocument,
} from '../users/schemas/business.schema';
import {
  AdminUser,
  AdminUserDocument,
} from '../users/schemas/admin-user.schema';
import {
  SHOPIFY_API_VERSION,
  SHOPIFY_DEFAULT_SCOPES,
  SHOPIFY_ERRORS,
  SHOPIFY_INSTALL_LOCK_PREFIX,
  SHOPIFY_INSTALL_LOCK_TTL_SECONDS,
  SHOPIFY_OAUTH_NONCE_PREFIX,
  SHOPIFY_OAUTH_NONCE_TTL_SECONDS,
  SHOPIFY_OFFLINE_TOKEN_TYPE,
  SHOPIFY_ONLINE_TOKEN_TYPE,
  SHOPIFY_SHOP_DOMAIN_PATTERN,
  SHOPIFY_STOREFRONT_KEY_METAFIELD,
  SHOPIFY_SYNC_QUEUE,
  SHOPIFY_TOKEN_CLOCK_SKEW_SECONDS,
  SHOPIFY_TOKEN_EXCHANGE_GRANT,
  SHOPIFY_WEBHOOK_TOPICS,
} from './shopify.constants';
import {
  ShopifyAssociatedUser,
  ShopifySessionResult,
  ShopifySessionTokenClaims,
  ShopifyShopDetails,
  ShopifyTokenExchangeResult,
} from './shopify.types';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly tokenService: ShopifyTokenService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectQueue(SHOPIFY_SYNC_QUEUE)
    private readonly syncQueue: Queue,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration
  // ───────────────────────────────────────────────────────────────────────────

  private get apiKey(): string {
    const value = this.configService.get<string>('SHOPIFY_API_KEY');
    if (!value) {
      // Without the Client ID there is no expected `aud`, so no session token
      // can be validated. Failing here beats accepting a token for any app.
      throw new DomainException(
        SHOPIFY_ERRORS.MISSING_CONFIG,
        'SHOPIFY_API_KEY is not configured.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return value;
  }

  private get apiSecret(): string {
    const value = this.configService.get<string>('SHOPIFY_API_SECRET');
    if (!value) {
      throw new DomainException(
        SHOPIFY_ERRORS.MISSING_CONFIG,
        'SHOPIFY_API_SECRET is not configured.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return value;
  }

  /**
   * Origin that serves this NestJS API, used to build the addresses Shopify
   * calls back on: the webhook endpoint, the OAuth callback, and the billing
   * return URL.
   *
   * This is deliberately NOT `SHOPIFY_APP_URL`. Shopify's "App URL" is the
   * origin of the embedded frontend (`packages/shopify-app`), which in a split
   * deployment is a different host from the API — pointing webhooks at it
   * registers them successfully and then 404s every delivery, so catalog sync
   * fails silently. `SHOPIFY_APP_URL` is still accepted as a fallback for
   * single-host deployments, with a warning, because the two were once the same
   * variable.
   */
  private get apiUrl(): string {
    const explicit = this.configService
      .get<string>('ORA_API_URL')
      ?.replace(/\/$/, '');
    if (explicit) return explicit;

    const legacy = this.configService
      .get<string>('SHOPIFY_APP_URL')
      ?.replace(/\/$/, '');

    if (legacy) {
      this.logger.warn(
        '[ShopifyService] ORA_API_URL is unset, so SHOPIFY_APP_URL is being used to build webhook and callback addresses. Set ORA_API_URL to this API\'s own origin — if SHOPIFY_APP_URL points at the embedded frontend instead, every webhook delivery will 404.',
      );
      return legacy;
    }

    return '';
  }


  private get scopes(): string[] {
    const configured = this.configService.get<string>('SHOPIFY_SCOPES');
    if (!configured) return SHOPIFY_DEFAULT_SCOPES;
    return configured
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Shop domain handling
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Reduces anything shop-shaped to a bare `store.myshopify.com` and rejects
   * everything else. Every outbound Admin API URL is built from the result, so
   * an unvalidated value here would let a caller choose the request's host.
   */
  normalizeShopDomain(raw: string): string {
    const trimmed = (raw || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    if (!SHOPIFY_SHOP_DOMAIN_PATTERN.test(trimmed)) {
      throw new DomainException(
        SHOPIFY_ERRORS.INVALID_SHOP_DOMAIN,
        'A shop must be a <store>.myshopify.com domain.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return trimmed;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Session token verification
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Verifies a Shopify App Bridge session token.
   *
   * Every claim is checked, not only the signature. A token minted for another
   * app in the same Partner account carries a valid signature under the shared
   * secret, so `aud` is what actually binds a token to this app; `dest` and
   * `iss` must agree on one shop, or a token issued for shop A could be
   * presented as shop B.
   */
  verifySessionToken(token: string): ShopifySessionTokenClaims {
    if (!token) {
      throw new DomainException(
        SHOPIFY_ERRORS.MISSING_SESSION_TOKEN,
        'A Shopify session token is required.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw this.invalidToken('malformed token');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    let header: { alg?: string; typ?: string };
    let claims: ShopifySessionTokenClaims;
    try {
      header = JSON.parse(this.base64UrlDecode(encodedHeader));
      claims = JSON.parse(this.base64UrlDecode(encodedPayload));
    } catch {
      throw this.invalidToken('undecodable token segments');
    }

    // Pinning the algorithm prevents an `alg: none` token, and prevents a
    // token switched to an algorithm this code does not actually verify.
    if (header.alg !== 'HS256') {
      throw this.invalidToken(`unexpected algorithm ${header.alg}`);
    }

    const expected = crypto
      .createHmac('sha256', this.apiSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const provided = Buffer.from(encodedSignature, 'base64url');

    // timingSafeEqual throws RangeError on a length mismatch, which would
    // surface as a 500 rather than a rejected token.
    if (
      expected.length !== provided.length ||
      !crypto.timingSafeEqual(expected, provided)
    ) {
      throw this.invalidToken('signature mismatch');
    }

    if (claims.aud !== this.apiKey) {
      throw this.invalidToken('aud does not match this app');
    }

    const destHost = this.hostOf(claims.dest);
    const issHost = this.hostOf(claims.iss);
    if (!destHost || !issHost || destHost !== issHost) {
      throw this.invalidToken('dest and iss identify different shops');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      typeof claims.exp !== 'number' ||
      nowSeconds >= claims.exp + SHOPIFY_TOKEN_CLOCK_SKEW_SECONDS
    ) {
      throw this.invalidToken('token has expired');
    }
    if (
      typeof claims.nbf !== 'number' ||
      nowSeconds < claims.nbf - SHOPIFY_TOKEN_CLOCK_SKEW_SECONDS
    ) {
      throw this.invalidToken('token is not yet valid');
    }

    // Throws if the host is not a myshopify domain.
    this.normalizeShopDomain(destHost);

    return claims;
  }

  /** The shop a verified session token belongs to. */
  shopFromClaims(claims: ShopifySessionTokenClaims): string {
    return this.normalizeShopDomain(this.hostOf(claims.dest) || '');
  }

  private hostOf(value?: string): string | null {
    if (!value) return null;
    try {
      return new URL(value).host.toLowerCase();
    } catch {
      return null;
    }
  }

  private base64UrlDecode(segment: string): string {
    return Buffer.from(segment, 'base64url').toString('utf8');
  }

  private invalidToken(reason: string): DomainException {
    this.logger.warn(`[ShopifyService] Session token rejected: ${reason}.`);
    return new DomainException(
      SHOPIFY_ERRORS.INVALID_SESSION_TOKEN,
      'The Shopify session token is invalid.',
      HttpStatus.UNAUTHORIZED,
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Token exchange and Admin API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Trades a verified session token for a long-lived offline access token.
   * Shopify-managed installation grants the scopes declared in
   * `shopify.app.toml`, so no consent redirect is involved.
   */
  async exchangeSessionToken(
    shop: string,
    sessionToken: string,
  ): Promise<ShopifyTokenExchangeResult> {
    const shopDomain = this.normalizeShopDomain(shop);
    const response = await fetch(
      `https://${shopDomain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          grant_type: SHOPIFY_TOKEN_EXCHANGE_GRANT,
          subject_token: sessionToken,
          subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
          requested_token_type: SHOPIFY_OFFLINE_TOKEN_TYPE,
          expiring: 1,
        }),
      },
    );

    if (!response.ok) {
      // Never log or return this body verbatim. A rejected exchange can echo
      // the request, and the request carries the App Bridge session token as
      // `subject_token` plus `client_secret`.
      const summary = ShopifyOAuthError.summarize(await response.text());
      this.logger.error(
        `[ShopifyService] Token exchange for ${shopDomain} returned HTTP ${response.status}: ${summary}`,
      );
      throw new DomainException(
        SHOPIFY_ERRORS.TOKEN_EXCHANGE_FAILED,
        'Shopify rejected the token exchange.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const body = (await response.json()) as {
      access_token?: string;
      scope?: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_token_expires_in?: number;
    };

    if (!body.access_token) {
      throw new DomainException(
        SHOPIFY_ERRORS.TOKEN_EXCHANGE_FAILED,
        'Shopify returned no access token.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      accessToken: body.access_token,
      scopes: (body.scope || '')
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean),
      refreshToken: body.refresh_token,
      expiresIn: body.expires_in,
      refreshTokenExpiresIn: body.refresh_token_expires_in,
    };
  }

  /**
   * Identifies the staff member a session token was minted for.
   *
   * The online access token this returns is thrown away; only
   * `associated_user` is wanted, and it is the one place Shopify says whether
   * this person is the account owner. Called once per staff member — after
   * that the ORA account carries the staff id and this exchange is skipped.
   */
  async identifyStaffUser(
    shop: string,
    sessionToken: string,
  ): Promise<ShopifyAssociatedUser> {
    const shopDomain = this.normalizeShopDomain(shop);
    const response = await fetch(
      `https://${shopDomain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          grant_type: SHOPIFY_TOKEN_EXCHANGE_GRANT,
          subject_token: sessionToken,
          subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
          requested_token_type: SHOPIFY_ONLINE_TOKEN_TYPE,
        }),
      },
    );

    if (!response.ok) {
      // Same reason as every other exchange here: the error body can echo the
      // request, which carries `client_secret` and the session token.
      const summary = ShopifyOAuthError.summarize(await response.text());
      this.logger.error(
        `[ShopifyService] Online token exchange for ${shopDomain} returned HTTP ${response.status}: ${summary}`,
      );
      throw new DomainException(
        SHOPIFY_ERRORS.TOKEN_EXCHANGE_FAILED,
        'Shopify could not confirm which staff member is signed in.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const body = (await response.json()) as {
      associated_user?: {
        id?: number | string;
        first_name?: string;
        last_name?: string;
        email?: string;
        email_verified?: boolean;
        account_owner?: boolean;
        collaborator?: boolean;
        locale?: string;
      };
    };

    const user = body.associated_user;
    if (!user?.id) {
      throw new DomainException(
        SHOPIFY_ERRORS.TOKEN_EXCHANGE_FAILED,
        'Shopify returned no staff member for this session.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      id: String(user.id),
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email?.toLowerCase(),
      emailVerified: user.email_verified,
      // Absent is not the same as false for a flag that grants billing rights,
      // but the safe reading of a missing flag is the one that grants less.
      accountOwner: user.account_owner === true,
      collaborator: user.collaborator === true,
      locale: user.locale,
    };
  }

  /** Exchanges an authorization code, for the non-embedded fallback install. */
  async exchangeCode(
    shop: string,
    code: string,
  ): Promise<ShopifyTokenExchangeResult> {
    const shopDomain = this.normalizeShopDomain(shop);
    const response = await fetch(
      `https://${shopDomain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          code,
          expiring: 1,
        }),
      },
    );

    if (!response.ok) {
      // Same reason as in `exchangeSessionToken`: the body can echo the
      // request, which here carries `client_secret` and the authorization code.
      const summary = ShopifyOAuthError.summarize(await response.text());
      this.logger.error(
        `[ShopifyService] Authorization code exchange for ${shopDomain} returned HTTP ${response.status}: ${summary}`,
      );
      throw new DomainException(
        SHOPIFY_ERRORS.TOKEN_EXCHANGE_FAILED,
        'Shopify rejected the authorization code.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const body = (await response.json()) as {
      access_token?: string;
      scope?: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_token_expires_in?: number;
    };

    if (!body.access_token) {
      throw new DomainException(
        SHOPIFY_ERRORS.TOKEN_EXCHANGE_FAILED,
        'Shopify returned no access token.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      accessToken: body.access_token,
      scopes: (body.scope || '')
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean),
      refreshToken: body.refresh_token,
      expiresIn: body.expires_in,
      refreshTokenExpiresIn: body.refresh_token_expires_in,
    };
  }

  async fetchShopDetails(
    shop: string,
    accessToken: string,
  ): Promise<ShopifyShopDetails> {
    const shopDomain = this.normalizeShopDomain(shop);
    const response = await this.adminRequest(
      shopDomain,
      accessToken,
      'GET',
      'shop.json',
    );

    const shopPayload = (response as any)?.shop || {};

    return {
      id: shopPayload.id,
      name: shopPayload.name || shopDomain,
      email: shopPayload.email,
      shopOwner: shopPayload.shop_owner,
      domain: shopPayload.domain,
      myshopifyDomain: shopPayload.myshopify_domain || shopDomain,
      currency: shopPayload.currency,
      planName: shopPayload.plan_name,
    };
  }

  /**
   * Registers the install-time webhooks.
   *
   * Catalog topics go to the ingestion route, which already verifies Shopify
   * HMACs, dedupes on webhook id, and resolves the tenant from the signed shop
   * domain. `app_subscriptions/update` goes elsewhere, because that route
   * dispatches on catalog topics only. Each topic carries its own path in
   * SHOPIFY_WEBHOOK_TOPICS.
   */
  async registerWebhooks(shop: string, accessToken: string): Promise<void> {
    const shopDomain = this.normalizeShopDomain(shop);
    if (!this.apiUrl) {
      this.logger.warn(
        `[ShopifyService] Neither ORA_API_URL nor SHOPIFY_APP_URL is set, so no webhooks were registered for ${shopDomain}.`,
      );
      return;
    }

    // In parallel, because this runs inside POST /shopify/session on a first
    // install, where the merchant is watching a loading state in an iframe.
    // One registration per topic, run in sequence, made six round trips to
    // Shopify the merchant had to wait through; together with the token
    // exchange and the shop lookup that was eight. `allSettled`, so one
    // failure does not abandon the rest.
    const registrations = SHOPIFY_WEBHOOK_TOPICS.map(async ({ topic, path }) => {
      const address = `${this.apiUrl}${path}`;
      try {
        await this.adminRequest(shopDomain, accessToken, 'POST', 'webhooks.json', {
          webhook: { topic, address, format: 'json' },
        });
        this.logger.log(
          `[ShopifyService] Registered webhook '${topic}' for ${shopDomain}.`,
        );
      } catch (err: any) {
        // Shopify answers 422 when the topic is already registered at this
        // address, which is the expected result of a reinstall.
        this.logger.warn(
          `[ShopifyService] Webhook '${topic}' not registered for ${shopDomain}: ${err.message}`,
        );
      }
    });

    await Promise.allSettled(registrations);
  }

  private async adminRequest(
    shopDomain: string,
    accessToken: string,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/${path}`,
      {
        method,
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );

    if (!response.ok) {
      throw new DomainException(
        SHOPIFY_ERRORS.ADMIN_API_ERROR,
        `Shopify Admin API ${method} ${path} returned HTTP ${response.status}.`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response.json();
  }

  private async adminGraphql<T>(
    shopDomain: string,
    accessToken: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      },
    );

    if (!response.ok) {
      throw new DomainException(
        SHOPIFY_ERRORS.ADMIN_API_ERROR,
        `Shopify Admin GraphQL returned HTTP ${response.status}.`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const body = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    // GraphQL reports its failures inside a 200, so the HTTP check above is
    // not enough on its own.
    if (body.errors?.length) {
      throw new DomainException(
        SHOPIFY_ERRORS.ADMIN_API_ERROR,
        body.errors.map((error) => error.message).join('; '),
        HttpStatus.BAD_GATEWAY,
      );
    }

    return body.data as T;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Storefront key delivery
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Publishes the tenant's publishable key into an app-owned metafield, which
   * is where the theme app extension reads it from.
   *
   * This is what makes the storefront widget zero-configuration: the merchant
   * switches the app embed on in the theme editor and the key is already
   * there, with nothing to copy from the ORA dashboard.
   *
   * Never throws. A store with no key in its metafield still renders — the
   * embed falls back to its own override setting and writes a diagnostic HTML
   * comment — whereas a throw here would fail the install or the session
   * exchange behind it, which is a far worse outcome than a widget that needs
   * one more page load to appear.
   */
  async syncStorefrontKey(
    business: BusinessDocument,
    accessToken: string,
  ): Promise<void> {
    const publishableKey = business.publishableKey;
    const shopDomain = business.shopifyShopDomain;

    if (!publishableKey || !shopDomain) return;

    // The metafield already holds this exact key. Skipping here is what keeps
    // the session exchange — which runs on every embedded page load — from
    // spending two Admin API round trips per load.
    if (business.shopifyStorefrontKeySyncedValue === publishableKey) return;

    try {
      const installation = await this.adminGraphql<{
        currentAppInstallation?: { id?: string };
      }>(
        shopDomain,
        accessToken,
        `query OraAppInstallation { currentAppInstallation { id } }`,
      );

      const ownerId = installation?.currentAppInstallation?.id;
      if (!ownerId) {
        this.logger.warn(
          `[ShopifyService] ${shopDomain} returned no app installation id, so the storefront key was not published.`,
        );
        return;
      }

      const result = await this.adminGraphql<{
        metafieldsSet?: {
          userErrors?: Array<{ field?: string[]; message: string }>;
        };
      }>(
        shopDomain,
        accessToken,
        `mutation OraSetStorefrontKey($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors { field message }
          }
        }`,
        {
          metafields: [
            {
              ownerId,
              namespace: SHOPIFY_STOREFRONT_KEY_METAFIELD.namespace,
              key: SHOPIFY_STOREFRONT_KEY_METAFIELD.key,
              type: SHOPIFY_STOREFRONT_KEY_METAFIELD.type,
              value: publishableKey,
            },
          ],
        },
      );

      const userErrors = result?.metafieldsSet?.userErrors || [];
      if (userErrors.length) {
        // A user error is a 200 with the write rejected, so it has to be read
        // out rather than inferred from the absence of an exception.
        this.logger.warn(
          `[ShopifyService] Publishing the storefront key for ${shopDomain} was rejected: ${userErrors
            .map((error) => error.message)
            .join('; ')}`,
        );
        return;
      }

      business.shopifyStorefrontKeySyncedValue = publishableKey;
      await business.save();

      this.logger.log(
        `[ShopifyService] Published the storefront key for ${shopDomain}; the theme app extension can now render without merchant input.`,
      );
    } catch (err: any) {
      this.logger.warn(
        `[ShopifyService] Could not publish the storefront key for ${shopDomain}: ${err.message}. The next embedded page load retries.`,
      );
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // OAuth fallback helpers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Builds the consent URL for a non-embedded install, storing the nonce in
   * Redis. A cookie would be the conventional home for it, but the embedded app
   * runs third-party in an iframe where cookies are unreliable or blocked, so
   * one storage location serves both flows.
   */
  async buildAuthorizeUrl(shop: string): Promise<string> {
    const shopDomain = this.normalizeShopDomain(shop);
    const nonce = crypto.randomBytes(16).toString('hex');

    await this.redisService.setSingleUseValue(
      `${SHOPIFY_OAUTH_NONCE_PREFIX}${shopDomain}`,
      nonce,
      SHOPIFY_OAUTH_NONCE_TTL_SECONDS,
    );

    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope: this.scopes.join(','),
      redirect_uri: `${this.apiUrl}/api/v1/shopify/callback`,
      state: nonce,
    });

    return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Verifies an OAuth callback HMAC over the raw query string.
   *
   * The raw string is required: the parsed query object reorders keys and
   * percent-decodes values, so it cannot reproduce the bytes Shopify signed.
   */
  verifyQueryHmac(rawQueryString: string): boolean {
    const params = new URLSearchParams(rawQueryString);
    const providedHmac = params.get('hmac');
    if (!providedHmac) return false;

    params.delete('hmac');
    params.delete('signature');

    const message = [...params.entries()]
      .map(([key, value]) => [key, value] as [string, string])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const expected = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest();
    const provided = Buffer.from(providedHmac, 'hex');

    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(expected, provided);
  }

  /** Consumes the stored nonce, so a replayed callback finds nothing. */
  async consumeNonce(shop: string, state: string): Promise<void> {
    const shopDomain = this.normalizeShopDomain(shop);
    const stored = await this.redisService.consumeSingleUseValue(
      `${SHOPIFY_OAUTH_NONCE_PREFIX}${shopDomain}`,
    );

    if (!stored || !state || stored !== state) {
      throw new DomainException(
        SHOPIFY_ERRORS.INVALID_NONCE,
        'The OAuth state parameter is missing, expired, or already used.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Install and provisioning
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * The session endpoint's whole job.
   *
   * The embedded client calls this on every page load, because App Bridge
   * tokens live about a minute. Only the first call for a shop performs the
   * install; the rest reuse what is already there.
   */
  async establishSession(
    sessionToken: string,
    reqInfo: { userAgent?: string; ip?: string } = {},
  ): Promise<ShopifySessionResult> {
    const claims = this.verifySessionToken(sessionToken);
    const shopDomain = this.shopFromClaims(claims);

    const found = await this.businessModel
      .findOne({ shopifyShopDomain: shopDomain })
      .select('+shopifyAccessToken +shopifyRefreshToken')
      .exec();

    let business: BusinessDocument;
    let installed = false;

    if (!found) {
      business = await this.installShop(shopDomain, sessionToken);
      installed = true;
    } else {
      business = found;

      let currentToken: string | null = null;
      try {
        currentToken =
          BusinessCredentialsUtil.reveal(business.shopifyAccessToken) || null;
      } catch {
        currentToken = null;
      }

      // Non-expiring tokens (shpua_ prefix) or missing tokens must be upgraded
      // to expiring offline tokens (shppa_ prefix) required by Shopify's 2026 Admin API.
      const isLegacyToken = !currentToken || currentToken.startsWith('shpua_');

      // A shop installed before the refresh token was persisted holds an
      // expiring token with nothing to renew it. The session token in hand can
      // mint a full set, and this endpoint runs on every page load, so the
      // repair costs one exchange and needs no migration script.
      const hasNoRefreshPath = !isLegacyToken && !business.shopifyRefreshToken;

      if (isLegacyToken || hasNoRefreshPath) {
        this.logger.log(
          hasNoRefreshPath
            ? `[ShopifyService] ${shopDomain} has an expiring access token but no stored refresh token; re-running token exchange.`
            : `[ShopifyService] Upgrading legacy access token for ${shopDomain} via token exchange.`,
        );
        try {
          const exchanged = await this.exchangeSessionToken(
            shopDomain,
            sessionToken,
          );
          await this.tokenService.persist(business, exchanged);
          this.logger.log(
            `[ShopifyService] Successfully upgraded token for ${shopDomain} (token prefix: ${exchanged.accessToken.substring(0, 6)}).`,
          );
        } catch (err: any) {
          this.logger.error(
            `[ShopifyService] Token upgrade for ${shopDomain} failed: ${err.message}`,
          );
        }
      } else {
        await this.refreshScopesIfChanged(business, shopDomain, sessionToken);
      }
    }

    // Covers the two cases the install-time write cannot: a metafield write
    // that failed while the rest of the install succeeded, and a publishable
    // key rotated afterwards. The field comparison is what keeps this free on
    // the page loads where nothing has changed.
    if (business.shopifyStorefrontKeySyncedValue !== business.publishableKey) {
      const adminToken = await this.tokenService.getValidAccessTokenFor(business);
      if (adminToken) {
        await this.syncStorefrontKey(business, adminToken);
      }
    }

    const owner = await this.resolveStaffUser(business, claims, sessionToken);

    const { tokens } = await this.authService.issueSessionForUser(
      owner._id.toString(),
      business._id.toString(),
      owner.email,
      owner.role,
      reqInfo,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      business: {
        id: business._id.toString(),
        name: business.name,
        domain: business.domain,
        publishableKey: business.publishableKey,
        shopifyShopDomain: business.shopifyShopDomain,
      },
      user: {
        id: owner._id.toString(),
        name: owner.name,
        email: owner.email,
        role: owner.role,
        emailVerified: owner.emailVerified,
      },
      installed,
    };
  }

  /**
   * Runs the one-time install under a per-shop lock.
   *
   * Token exchange, webhook registration, and the sync enqueue are not
   * idempotent, and two concurrent page loads would otherwise each run all
   * three. The unique index on `shopifyShopDomain` protects only the Business
   * row.
   */
  private async installShop(
    shopDomain: string,
    sessionToken: string,
  ): Promise<BusinessDocument> {
    const lockKey = `${SHOPIFY_INSTALL_LOCK_PREFIX}${shopDomain}`;
    const acquired = await this.redisService.acquireLock(
      lockKey,
      SHOPIFY_INSTALL_LOCK_TTL_SECONDS,
    );

    if (!acquired) {
      // Another request holds the lock. Give its transaction a moment, then
      // use whatever it produced rather than installing a second time.
      const existing = await this.waitForConcurrentInstall(shopDomain);
      if (existing) return existing;

      throw new DomainException(
        SHOPIFY_ERRORS.INSTALL_IN_PROGRESS,
        'This store is already being installed. Retry in a moment.',
        HttpStatus.CONFLICT,
      );
    }

    try {
      // Re-check inside the lock: the holder may have finished between the
      // caller's read and this acquisition.
      const raced = await this.businessModel
        .findOne({ shopifyShopDomain: shopDomain })
        .exec();
      if (raced) return raced;

      const exchanged = await this.exchangeSessionToken(
        shopDomain,
        sessionToken,
      );

      return this.provisionTenant(
        shopDomain,
        exchanged.accessToken,
        exchanged.scopes,
        exchanged,
      );
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  private async waitForConcurrentInstall(
    shopDomain: string,
  ): Promise<BusinessDocument | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const business = await this.businessModel
        .findOne({ shopifyShopDomain: shopDomain })
        .exec();
      if (business) return business;
    }
    return null;
  }

  /**
   * Creates the tenant, its owner, and its webhooks, then queues the catalog
   * import. Also usable by the fallback OAuth callback, which already holds an
   * access token.
   */
  async provisionTenant(
    shopDomain: string,
    accessToken: string,
    scopes: string[],
    expiry?: Pick<
      ShopifyTokenExchangeResult,
      'refreshToken' | 'expiresIn' | 'refreshTokenExpiresIn'
    >,
  ): Promise<BusinessDocument> {
    const normalized = this.normalizeShopDomain(shopDomain);
    const details = await this.fetchShopDetails(normalized, accessToken);

    const business = await this.bindOrCreateBusiness(
      normalized,
      accessToken,
      scopes,
      details,
    );

    // The refresh token and the expiries are written after the document
    // exists, so the bind branch and the create branch cannot disagree about
    // them. Without this, an expiring token installs with no way to renew it.
    if (expiry?.refreshToken || expiry?.expiresIn) {
      await this.tokenService.persist(business, {
        accessToken,
        scopes,
        refreshToken: expiry.refreshToken,
        expiresIn: expiry.expiresIn,
        refreshTokenExpiresIn: expiry.refreshTokenExpiresIn,
      });
    }

    await this.ensureOwner(business, normalized, details);
    await this.registerWebhooks(normalized, accessToken);

    // Publishes the key the theme app extension reads. Deliberately before the
    // sync enqueue and deliberately unable to throw: the merchant's next stop
    // is the theme editor, and a key that is not there yet turns a one-click
    // embed back into a copy-paste.
    await this.syncStorefrontKey(business, accessToken);

    // The enqueue is deliberately not allowed to fail the install. By this
    // point the tenant, its owner, and its webhooks all exist, and throwing
    // would leave the merchant provisioned but without a session — and the
    // install branch does not run again, because the Business now exists. A
    // missing initial import is recoverable; a tenant nobody can sign into is
    // not. Webhooks keep the catalog current either way.
    try {
      await this.syncQueue.add(
        'initial-catalog-sync',
        { businessId: business._id.toString(), shopDomain: normalized },
        {
          // Keyed by shop so a reinstall replaces a pending job instead of
          // queueing a second full walk of the same catalog. BullMQ rejects a
          // custom job id containing ':' ("Custom Ids cannot contain :"), which
          // rules out the obvious `initial-sync:<shop>` shape.
          jobId: `initial-sync-${normalized}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        },
      );
    } catch (err: any) {
      this.logger.error(
        `[ShopifyService] Initial catalog sync could not be queued for ${normalized}: ${err.message}. The store is installed; re-queue the import manually.`,
      );
    }

    this.logger.log(
      `[ShopifyService] Provisioned ${normalized} as business ${business._id.toString()}.`,
    );

    return business;
  }

  /**
   * Decides whether this install joins an existing tenant or gets a new one.
   *
   * A merchant who signed up on the web already has a Business, so linking is
   * only safe when that Business has no catalog source of its own. Repointing a
   * tenant that is already on WooCommerce or a feed would silently switch which
   * catalog the voice agent answers from.
   */
  private async bindOrCreateBusiness(
    shopDomain: string,
    accessToken: string,
    scopes: string[],
    details: ShopifyShopDetails,
  ): Promise<BusinessDocument> {
    const shopifyFields = {
      shopifyShopDomain: shopDomain,
      shopifyStoreUrl: `https://${shopDomain}`,
      shopifyOwnerEmail: details.email,
      shopifyAccessToken: BusinessCredentialsUtil.protect(accessToken),
      shopifyScopes: scopes.length ? scopes : this.scopes,
      shopifyInstalledAt: new Date(),
      shopifyUninstalledAt: undefined,
      connectedPlatform: 'shopify',
      // The default is 'pending', which fails every tenant-scoped API call.
      // Shopify has already established this merchant's identity.
      status: 'active',
      keyStatus: 'active',
    };

    if (details.email) {
      const existingUser = await this.usersService.findByEmail(details.email);
      if (existingUser?.businessId) {
        const existingBusiness = await this.businessModel
          .findById(existingUser.businessId)
          .exec();

        const isFreeToBind =
          existingBusiness &&
          !existingBusiness.shopifyShopDomain &&
          (existingBusiness.connectedPlatform || 'none') === 'none';

        if (isFreeToBind) {
          Object.assign(existingBusiness, shopifyFields);
          await existingBusiness.save();
          this.logger.log(
            `[ShopifyService] Linked ${shopDomain} to existing business ${existingBusiness._id.toString()}.`,
          );
          return existingBusiness;
        }
      }
    }

    return this.usersService.createBusiness(
      details.name || shopDomain,
      details.domain || shopDomain,
      shopifyFields as any,
    );
  }

  /**
   * Guarantees the tenant has an owner that can hold a session.
   *
   * When the shop email already belongs to another tenant, a store-scoped
   * alias identity is created instead of repointing that account. The alias
   * cannot receive mail, which is why the real address is kept on the Business
   * as `shopifyOwnerEmail` for billing and invoice delivery.
   */
  private async ensureOwner(
    business: BusinessDocument,
    shopDomain: string,
    details: ShopifyShopDetails,
  ): Promise<AdminUserDocument> {
    const existingOwner = await this.adminUserModel
      .findOne({ businessId: business._id as any })
      .exec();
    if (existingOwner) return existingOwner;

    const ownerName = details.shopOwner || details.name || shopDomain;
    let email = details.email?.toLowerCase();

    if (email) {
      const emailTaken = await this.usersService.findByEmail(email);
      if (emailTaken) {
        email = `shopify+${shopDomain}@ora.internal`;
        this.logger.log(
          `[ShopifyService] ${details.email} already has an ORA account, so ${shopDomain} uses a store-scoped identity.`,
        );
      }
    } else {
      email = `shopify+${shopDomain}@ora.internal`;
    }

    // The schema requires a password hash. This one is unguessable and never
    // handed out, so web dashboard access goes through the forgot-password flow.
    const passwordHash = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      10,
    );

    return this.usersService.createAdminUser({
      businessId: business._id.toString(),
      email,
      passwordHash,
      name: ownerName,
      role: AdminRole.OWNER,
      // Shopify has verified this address. Left false, billing emails and
      // invoices stay queued for the account.
      emailVerified: true,
    });
  }

  /**
   * Resolves the ORA account for the staff member behind a session token.
   *
   * This used to return the tenant's oldest AdminUser, which is always the
   * OWNER created at install. Every staff member Shopify let into the app
   * therefore received an owner session and could rotate the secret API key,
   * change the plan, or delete the catalog. The `sub` claim was parsed and
   * thrown away.
   *
   * Identity is resolved once per staff member. After that the account carries
   * the staff id and this costs a single indexed read.
   */
  private async resolveStaffUser(
    business: BusinessDocument,
    claims: ShopifySessionTokenClaims,
    sessionToken: string,
  ): Promise<AdminUserDocument> {
    const staffUserId = claims.sub ? String(claims.sub) : '';

    // Issuing a session without knowing who asked for it is the bug this
    // method exists to fix, so a token that cannot say is rejected.
    if (!staffUserId) {
      throw this.invalidToken('no sub claim, so the staff member is unknown');
    }

    const known = await this.adminUserModel
      .findOne({
        businessId: business._id as any,
        shopifyStaffUserId: staffUserId,
      })
      .exec();
    if (known) return known;

    // Deliberately allowed to throw. A failure here means Shopify would not
    // say who this is, and the alternative — falling back to the owner account
    // — is exactly the behavior being removed.
    const staff = await this.identifyStaffUser(
      business.shopifyShopDomain || '',
      sessionToken,
    );

    if (staff.accountOwner) {
      // The install created an owner from `shop.json` before anyone had
      // signed in, so it carries no staff id. The account owner's first visit
      // claims that record rather than creating a second owner beside it.
      const unlinkedOwner = await this.adminUserModel
        .findOne({
          businessId: business._id as any,
          role: AdminRole.OWNER,
          shopifyStaffUserId: { $exists: false },
        })
        .sort({ createdAt: 1 })
        .exec();

      if (unlinkedOwner) {
        unlinkedOwner.shopifyStaffUserId = staffUserId;
        await unlinkedOwner.save();
        this.logger.log(
          `[ShopifyService] Linked the owner account for ${business.shopifyShopDomain} to Shopify staff ${staffUserId}.`,
        );
        return unlinkedOwner;
      }
    }

    return this.createStaffUser(business, staff, staffUserId);
  }

  /**
   * Creates the ORA account for a staff member who has not used ORA before.
   *
   * Only the Shopify account owner becomes an ORA OWNER. Everyone else is
   * STAFF, which reads the dashboard, orders and conversations and is refused
   * billing, key management and connector configuration. Shopify exposes no
   * per-staff permission list to an app, so `account_owner` is the only
   * distinction available, and a wrong guess here spends the merchant's money.
   * Collaborators — outside partners and agencies — get the same STAFF role.
   */
  private async createStaffUser(
    business: BusinessDocument,
    staff: ShopifyAssociatedUser,
    staffUserId: string,
  ): Promise<AdminUserDocument> {
    const shopDomain = business.shopifyShopDomain || '';
    const name =
      [staff.firstName, staff.lastName].filter(Boolean).join(' ') ||
      `Shopify staff ${staffUserId}`;

    let email = staff.email;
    if (!email || (await this.usersService.findByEmail(email))) {
      // `AdminUser.email` is globally unique, so a staff address that already
      // belongs to another tenant cannot be reused here. The alias keeps the
      // account addressable without repointing theirs.
      email = `shopify+${staffUserId}+${shopDomain}@ora.internal`;
    }

    // The schema requires a hash. It is unguessable and never handed out;
    // dashboard access outside Shopify goes through forgot-password.
    const passwordHash = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      10,
    );

    const role = staff.accountOwner ? AdminRole.OWNER : AdminRole.STAFF;

    this.logger.log(
      `[ShopifyService] Creating a ${role} account for Shopify staff ${staffUserId} on ${shopDomain}.`,
    );

    return this.usersService.createAdminUser({
      businessId: business._id.toString(),
      email,
      passwordHash,
      name,
      role,
      emailVerified: staff.emailVerified ?? true,
      shopifyStaffUserId: staffUserId,
    });
  }

  /**
   * Re-runs token exchange when Shopify has granted a different scope set than
   * the stored one, so a scope change does not leave a token that cannot do
   * what the app now asks of it.
   */
  /**
   * Expands a granted scope list so it can be compared with a requested one.
   *
   * Shopify collapses `read_x` into `write_x` when both are requested, so a
   * store granted `read_products,write_products` reports only
   * `write_products`. Comparing the raw lists therefore never matches, and
   * every session exchange would pointlessly re-run token exchange.
   */
  private expandScopes(scopes: string[]): Set<string> {
    const expanded = new Set<string>();
    for (const scope of scopes) {
      expanded.add(scope);
      if (scope.startsWith('write_')) {
        expanded.add(`read_${scope.slice('write_'.length)}`);
      }
    }
    return expanded;
  }

  private async refreshScopesIfChanged(
    business: BusinessDocument,
    shopDomain: string,
    sessionToken: string,
  ): Promise<void> {
    const granted = this.expandScopes(business.shopifyScopes || []);
    const wanted = this.scopes;

    // Only a scope the app needs and does not have is worth re-exchanging for.
    // Extra granted scopes are not a mismatch.
    const missing = wanted.filter((scope) => !granted.has(scope));
    if (missing.length === 0) {
      return;
    }

    this.logger.log(
      `[ShopifyService] ${shopDomain} is missing scope(s) ${missing.join(', ')}; re-running token exchange.`,
    );

    try {
      const exchanged = await this.exchangeSessionToken(
        shopDomain,
        sessionToken,
      );

      // Persist through the token service so the refresh token and both
      // expiries are written here exactly as they are at install.
      this.tokenService.applyTokens(business, exchanged);
      if (!exchanged.scopes.length) {
        business.shopifyScopes = [...wanted];
      }
      await business.save();

      this.logger.log(
        `[ShopifyService] Refreshed access token for ${shopDomain} after a scope change.`,
      );
    } catch (err: any) {
      // A failed refresh must not block a merchant from loading the app with
      // the scopes they already granted.
      this.logger.warn(
        `[ShopifyService] Scope refresh for ${shopDomain} failed: ${err.message}`,
      );
    }
  }

  /** Resolves a shop domain to its tenant, for webhook and billing paths. */
  async findBusinessByShopDomain(
    shop: string,
  ): Promise<BusinessDocument | null> {
    return this.businessModel
      .findOne({ shopifyShopDomain: this.normalizeShopDomain(shop) })
      .exec();
  }

  async findBusinessById(id: string): Promise<BusinessDocument | null> {
    return this.businessModel.findById(id).exec();
  }
}
