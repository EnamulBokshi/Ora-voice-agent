/**
 * Shopify Admin API version used by every Shopify call in this codebase.
 *
 * Shopify ships a new version quarterly and supports roughly one year of them.
 * This value MUST be confirmed against Shopify's release notes before a
 * release; the previous hardcoded `2024-01` was left in place long enough to
 * sunset. Change it here only — no other file should carry a version literal.
 */
export const SHOPIFY_API_VERSION = '2026-07';

/** BullMQ queue that performs the authenticated initial catalog import. */
export const SHOPIFY_SYNC_QUEUE = 'shopify-catalog-sync';

/**
 * Scopes requested at install. Must stay in sync with the `scopes` list in
 * `packages/shopify-app/shopify.app.toml`, which is what Shopify-managed
 * installation actually grants.
 */
export const SHOPIFY_DEFAULT_SCOPES = [
  'read_products',
  'write_products',
  'read_inventory',
  'read_orders',
];

/** IETF grant type for exchanging a session token for an access token. */
export const SHOPIFY_TOKEN_EXCHANGE_GRANT =
  'urn:ietf:params:oauth:grant-type:token-exchange';

/** Requested token type: a long-lived token usable outside a user session. */
export const SHOPIFY_OFFLINE_TOKEN_TYPE =
  'urn:shopify:params:oauth:token-type:offline-access-token';

/** Webhook topics registered against the existing ingestion route. */
export const SHOPIFY_WEBHOOK_TOPICS = [
  'products/create',
  'products/update',
  'products/delete',
  'inventory_levels/update',
  'app/uninstalled',
];

/** The three topics Shopify requires before an app may be listed. */
export const SHOPIFY_COMPLIANCE_TOPICS = [
  'customers/data_request',
  'customers/redact',
  'shop/redact',
];

/** Redis key prefixes. */
export const SHOPIFY_INSTALL_LOCK_PREFIX = 'shopify:install-lock:';
export const SHOPIFY_OAUTH_NONCE_PREFIX = 'shopify:oauth-nonce:';

/** Install lock TTL. Long enough for token exchange plus webhook registration. */
export const SHOPIFY_INSTALL_LOCK_TTL_SECONDS = 60;

/** Single-use OAuth nonce TTL for the non-embedded fallback flow. */
export const SHOPIFY_OAUTH_NONCE_TTL_SECONDS = 600;

/** Allowed clock skew when validating App Bridge session token claims. */
export const SHOPIFY_TOKEN_CLOCK_SKEW_SECONDS = 5;

/** Page size for the catalog import. 250 is Shopify's maximum. */
export const SHOPIFY_SYNC_PAGE_SIZE = 250;

export const SHOPIFY_ERRORS = {
  MISSING_CONFIG: 'SHOPIFY_CONFIG_MISSING',
  MISSING_SESSION_TOKEN: 'SHOPIFY_SESSION_TOKEN_REQUIRED',
  INVALID_SESSION_TOKEN: 'SHOPIFY_INVALID_SESSION_TOKEN',
  INVALID_SHOP_DOMAIN: 'SHOPIFY_INVALID_SHOP_DOMAIN',
  TOKEN_EXCHANGE_FAILED: 'SHOPIFY_TOKEN_EXCHANGE_FAILED',
  INSTALL_IN_PROGRESS: 'SHOPIFY_INSTALL_IN_PROGRESS',
  SHOP_NOT_INSTALLED: 'SHOPIFY_SHOP_NOT_INSTALLED',
  INVALID_HMAC: 'SHOPIFY_INVALID_HMAC',
  INVALID_NONCE: 'SHOPIFY_INVALID_NONCE',
  ADMIN_API_ERROR: 'SHOPIFY_ADMIN_API_ERROR',
  BILLING_ERROR: 'SHOPIFY_BILLING_ERROR',
};

/**
 * A shop domain is always `<store>.myshopify.com`. Anything else presented as a
 * shop is rejected before it reaches an outbound request, so a caller cannot
 * point the server at a host of their choosing.
 */
export const SHOPIFY_SHOP_DOMAIN_PATTERN =
  /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
