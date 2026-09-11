import { SetMetadata } from '@nestjs/common';

export const NO_SUBSCRIPTION_REQUIRED_KEY = 'noSubscriptionRequired';

/**
 * Exempts a route, or a whole controller, from the subscription check.
 *
 * Only for what a tenant must reach in order to buy or fix a plan, or to
 * manage its own account: the plan list, the subscribe call, the billing
 * callbacks, the Shopify session exchange, invoices. Anything that delivers
 * product value must not carry this.
 */
export const NoSubscriptionRequired = () =>
  SetMetadata(NO_SUBSCRIPTION_REQUIRED_KEY, true);
