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

/**
 * Where the theme app extension reads the storefront publishable key from.
 *
 * The `$app:` prefix makes this an app-owned (app-data) metafield on the app's
 * own installation, which is why no metafield access scope appears in
 * `shopify.app.toml`: an app always owns its installation's metafields. Liquid
 * drops the prefix, so `$app:ora` is read as `app.metafields.ora` — see
 * `packages/shopify-app/extensions/ora-voice-widget/blocks/ora_widget.liquid`.
 * Changing either side alone silently blanks the key on every storefront.
 */
export const SHOPIFY_STOREFRONT_KEY_METAFIELD = {
  namespace: '$app:ora',
  key: 'publishable_key',
  type: 'single_line_text_field',
} as const;

/** IETF grant type for exchanging a session token for an access token. */
export const SHOPIFY_TOKEN_EXCHANGE_GRANT =
  'urn:ietf:params:oauth:grant-type:token-exchange';

/** Requested token type: a long-lived token usable outside a user session. */
export const SHOPIFY_OFFLINE_TOKEN_TYPE =
  'urn:shopify:params:oauth:token-type:offline-access-token';

/**
 * Requested token type for identifying the staff member at the keyboard.
 *
 * The session token's `sub` is an opaque staff id and nothing else — no name,
 * no address, and no way to tell the shop owner from a junior. Exchanging for
 * an online token is the only route to `associated_user`, which carries
 * `account_owner` and `collaborator`. It needs no extra access scope, unlike
 * the `read_users` alternative, which is Shopify Plus only.
 *
 * The token itself is deliberately discarded: ORA acts on the offline token,
 * and a per-user token it does not use is a credential it should not hold.
 */
export const SHOPIFY_ONLINE_TOKEN_TYPE =
  'urn:shopify:params:oauth:token-type:online-access-token';

/**
 * Webhook topics registered at install, each with the API path that receives
 * it.
 *
 * Not every topic can share one receiver. The ingestion route dispatches on
 * catalog topics and answers anything else with a warning, so a billing topic
 * pointed there is silently dropped — which is exactly how a cancelled
 * subscription used to keep full access. Keep the path next to the topic.
 */
export const SHOPIFY_WEBHOOK_TOPICS: ReadonlyArray<{
  topic: string;
  path: string;
}> = [
  { topic: 'products/create', path: '/api/v1/ingestion/webhooks/shopify' },
  { topic: 'products/update', path: '/api/v1/ingestion/webhooks/shopify' },
  { topic: 'products/delete', path: '/api/v1/ingestion/webhooks/shopify' },
  {
    topic: 'inventory_levels/update',
    path: '/api/v1/ingestion/webhooks/shopify',
  },
  { topic: 'app/uninstalled', path: '/api/v1/ingestion/webhooks/shopify' },
  {
    topic: 'app_subscriptions/update',
    path: '/api/v1/shopify/webhooks/app-subscriptions-update',
  },
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

/**
 * Records which plan a Shopify charge was created for, keyed by the numeric
 * charge id.
 *
 * The billing callback is unauthenticated and its query string is unsigned, so
 * the plan it activates can never be read from that query — a merchant could
 * approve the cheapest charge and come back naming the most expensive plan.
 * The plan is written here at charge-creation time, where the caller is
 * authenticated and tenant-scoped, and read back on the callback.
 */
export const SHOPIFY_PENDING_CHARGE_PREFIX = 'shopify:pending-charge:';

/**
 * How long a created-but-unapproved charge keeps its recorded plan.
 *
 * Approval normally follows within minutes. Seven days covers a merchant who
 * leaves the Shopify approval screen open or comes back to the emailed link,
 * and expiry is safe: a callback with no record leaves the stored plan
 * untouched rather than guessing.
 */
export const SHOPIFY_PENDING_CHARGE_TTL_SECONDS = 7 * 24 * 60 * 60;

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

/** Grant type that trades a rotating refresh token for a fresh access token. */
export const SHOPIFY_REFRESH_TOKEN_GRANT = 'refresh_token';

/**
 * How long before expiry an access token is treated as already expired.
 *
 * Expiring offline tokens live about 60 minutes. A job that starts with 30
 * seconds left would fail partway through, so refresh early rather than
 * retrying a half-finished catalog walk.
 */
export const SHOPIFY_TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;
