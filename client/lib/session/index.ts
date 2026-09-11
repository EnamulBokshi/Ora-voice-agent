import { SessionStrategy } from './types';
import { WebSessionStrategy } from './web-session';
import { ShopifySessionStrategy, isEmbedded } from './shopify-session';

export * from './types';
export * from './shopify-session';
export * from './web-session';

const webStrategy = new WebSessionStrategy();
const shopifyStrategy = new ShopifySessionStrategy();

/**
 * Determines whether the current context is running within Shopify (embedded iframe or /shopify routes).
 */
export function isShopifyContext(): boolean {
  if (typeof window === 'undefined') return false;

  const pathname = window.location.pathname;
  if (pathname.startsWith('/shopify')) return true;

  const search = window.location.search;
  if (search.includes('id_token=') || (search.includes('shop=') && search.includes('host='))) {
    return true;
  }

  return isEmbedded();
}

/**
 * Returns the appropriate session strategy for the current environment.
 */
export function getSessionStrategy(): SessionStrategy {
  if (isShopifyContext()) {
    return shopifyStrategy;
  }
  return webStrategy;
}
