/** Claims ORA relies on from a Shopify App Bridge session token. */
export interface ShopifySessionTokenClaims {
  /** `https://<shop>.myshopify.com/admin` — the shop the app is loaded in. */
  dest: string;
  /** `https://<shop>.myshopify.com/admin` plus the app's path. */
  iss: string;
  /** The app's Client ID. Must equal SHOPIFY_API_KEY. */
  aud: string;
  /** Shopify user id of the staff member viewing the app. */
  sub: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  sid: string;
}

/**
 * The staff member behind a session token, from an online token exchange.
 *
 * `accountOwner` is the only trustworthy signal of who may act on billing:
 * Shopify exposes no per-staff permission list to an app.
 */
export interface ShopifyAssociatedUser {
  /** Matches the `sub` claim of the session token that was exchanged. */
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailVerified?: boolean;
  /** True for exactly one person per shop. */
  accountOwner: boolean;
  /** An outside partner or agency rather than shop staff. */
  collaborator: boolean;
  locale?: string;
}

/** The subset of Shopify's `shop.json` payload used for provisioning. */
export interface ShopifyShopDetails {
  id: number;
  name: string;
  email?: string;
  shopOwner?: string;
  domain?: string;
  myshopifyDomain: string;
  currency?: string;
  planName?: string;
}

export interface ShopifyTokenExchangeResult {
  accessToken: string;
  scopes: string[];
  /** Present only for expiring offline tokens, which rotate on every refresh. */
  refreshToken?: string;
  /** Seconds until `accessToken` expires. Absent for a non-expiring token. */
  expiresIn?: number;
  /** Seconds until `refreshToken` expires — 90 days at issue, then shorter. */
  refreshTokenExpiresIn?: number;
}

/** What `POST /api/v1/shopify/session` hands back to the embedded app. */
export interface ShopifySessionResult {
  accessToken: string;
  refreshToken: string;
  business: {
    id: string;
    name: string;
    domain?: string;
    publishableKey?: string | null;
    shopifyShopDomain?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean;
  };
  /** True on the request that performed the install, for first-run UI. */
  installed: boolean;
}
