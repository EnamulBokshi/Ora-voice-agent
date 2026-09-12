import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BusinessCredentialsUtil } from '../utils/business-credentials.util';
import { ShopifyOAuthError } from '../utils/shopify-oauth-error.util';
import {
  Business,
  BusinessDocument,
} from '../../users/schemas/business.schema';
import {
  SHOPIFY_REFRESH_TOKEN_GRANT,
  SHOPIFY_TOKEN_REFRESH_SKEW_MS,
} from '../../shopify/shopify.constants';

/** What a refresh returns. Shopify rotates the refresh token on every call. */
export interface ShopifyRefreshedTokens {
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
  refreshTokenExpiresIn?: number;
  scopes: string[];
}

/**
 * Keeps a tenant's Shopify access token usable for callers that have no
 * session token to exchange.
 *
 * Expiring offline tokens last about 60 minutes, so the catalog sync worker,
 * the billing provider, and the live product fallback all read a token that is
 * usually already dead. Only the embedded app can re-run token exchange; every
 * other path has to refresh.
 *
 * This lives in `common/` rather than in `ShopifyModule` on purpose:
 * `ShopifyModule` already imports `BillingModule` and `IngestionModule`, and
 * two of the three callers are inside those.
 */
@Injectable()
export class ShopifyTokenService {
  private readonly logger = new Logger(ShopifyTokenService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) {}

  /**
   * Returns a usable Admin API access token for a tenant, refreshing first
   * when the stored one is expired or close to it.
   *
   * Returns undefined when the shop is not installed, when there is no token,
   * or when the refresh token is gone too — that last case needs a merchant to
   * reinstall, and no caller can resolve it on its own.
   */
  async getValidAccessToken(businessId: string): Promise<string | undefined> {
    const business = await this.businessModel
      .findById(businessId)
      .select('+shopifyAccessToken +shopifyRefreshToken')
      .exec();

    if (!business) return undefined;
    return this.getValidAccessTokenFor(business);
  }

  /** Same as `getValidAccessToken`, for a document already in hand. */
  async getValidAccessTokenFor(
    business: BusinessDocument,
  ): Promise<string | undefined> {
    const current = this.revealSafely(business.shopifyAccessToken);

    if (!this.needsRefresh(business)) {
      return current;
    }

    const refreshToken = this.revealSafely(business.shopifyRefreshToken);
    const shopDomain = business.shopifyShopDomain;

    if (!refreshToken || !shopDomain) {
      // A legacy non-expiring token has no expiry and no refresh token, and is
      // still accepted by Shopify until it is upgraded on the next embedded
      // load. Hand it back rather than failing the caller.
      return current;
    }

    if (
      business.shopifyRefreshTokenExpiresAt &&
      business.shopifyRefreshTokenExpiresAt.getTime() <= Date.now()
    ) {
      this.logger.error(
        `[ShopifyToken] The refresh token for ${shopDomain} expired on ${business.shopifyRefreshTokenExpiresAt.toISOString()}. The merchant must open the app to restore Admin API access.`,
      );
      return undefined;
    }

    try {
      const refreshed = await this.refresh(shopDomain, refreshToken);
      await this.persist(business, refreshed);
      this.logger.log(
        `[ShopifyToken] Refreshed the access token for ${shopDomain}.`,
      );
      return refreshed.accessToken;
    } catch (err: any) {
      this.logger.error(
        `[ShopifyToken] Refresh for ${shopDomain} failed: ${err.message}`,
      );
      // An expired token is worse than no token: the caller would spend a
      // request to learn that. Only hand back a token that has not expired.
      return this.isExpired(business) ? undefined : current;
    }
  }

  /**
   * Writes an access token, its refresh token, and both expiries onto a
   * Business. Used after a token exchange as well as after a refresh, so the
   * two paths cannot drift.
   *
   * Does not save; the caller decides when, because install writes several
   * other fields in the same document.
   */
  applyTokens(
    business: BusinessDocument,
    tokens: ShopifyRefreshedTokens,
  ): void {
    business.shopifyAccessToken = BusinessCredentialsUtil.protect(
      tokens.accessToken,
    );

    if (tokens.scopes.length) {
      business.shopifyScopes = tokens.scopes;
    }

    if (tokens.refreshToken) {
      business.shopifyRefreshToken = BusinessCredentialsUtil.protect(
        tokens.refreshToken,
      );
    }

    // An expiry of undefined means a non-expiring token, so clear any expiry
    // left over from a previous expiring one rather than keeping a stale date.
    business.shopifyTokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : undefined;

    if (tokens.refreshTokenExpiresIn) {
      business.shopifyRefreshTokenExpiresAt = new Date(
        Date.now() + tokens.refreshTokenExpiresIn * 1000,
      );
    }
  }

  /** Same as `applyTokens`, then saves. */
  async persist(
    business: BusinessDocument,
    tokens: ShopifyRefreshedTokens,
  ): Promise<void> {
    this.applyTokens(business, tokens);
    await business.save();
  }

  /**
   * Trades a refresh token for a new access token and a new refresh token.
   *
   * Two workers can race here. Shopify keeps the presented refresh token
   * usable for a window after it is used, so the loser of the race gets a
   * valid second token rather than an error, and the last write wins.
   */
  async refresh(
    shopDomain: string,
    refreshToken: string,
  ): Promise<ShopifyRefreshedTokens> {
    const response = await fetch(
      `https://${shopDomain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.requireConfig('SHOPIFY_API_KEY'),
          client_secret: this.requireConfig('SHOPIFY_API_SECRET'),
          grant_type: SHOPIFY_REFRESH_TOKEN_GRANT,
          refresh_token: refreshToken,
        }),
      },
    );

    if (!response.ok) {
      // The body can echo the request, which carries client_secret and the
      // refresh token. Summarize before it reaches a log or an exception.
      const summary = ShopifyOAuthError.summarize(await response.text());
      throw new Error(`HTTP ${response.status} (${summary})`);
    }

    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope?: string;
    };

    if (!body.access_token) {
      throw new Error('Shopify returned no access token.');
    }

    return {
      accessToken: body.access_token,
      expiresIn: body.expires_in,
      refreshToken: body.refresh_token,
      refreshTokenExpiresIn: body.refresh_token_expires_in,
      scopes: (body.scope || '')
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean),
    };
  }

  /** True when the token is expired or expires within the refresh skew. */
  private needsRefresh(business: BusinessDocument): boolean {
    if (!business.shopifyTokenExpiresAt) return false;
    return (
      business.shopifyTokenExpiresAt.getTime() -
        SHOPIFY_TOKEN_REFRESH_SKEW_MS <=
      Date.now()
    );
  }

  private isExpired(business: BusinessDocument): boolean {
    if (!business.shopifyTokenExpiresAt) return false;
    return business.shopifyTokenExpiresAt.getTime() <= Date.now();
  }

  private revealSafely(value?: string | null): string | undefined {
    try {
      return BusinessCredentialsUtil.reveal(value) || undefined;
    } catch {
      return undefined;
    }
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is not configured.`);
    }
    return value;
  }
}
