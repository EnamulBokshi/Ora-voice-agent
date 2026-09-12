/**
 * Who may change things, mirrored from the server's `@Roles` decorators.
 *
 * This is presentation only. `RolesGuard` is the enforcement, and it does not
 * consult this file — the point here is that a control the API will refuse
 * should not look available. Keep the two in step: a role added here that the
 * server refuses produces a button that fails, which is the state this exists
 * to remove.
 */
export const MANAGE_ROLES = ['owner', 'admin'] as const;

/** Roles that may read a tenant's dashboard at all. */
export const READ_ROLES = ['owner', 'admin', 'staff'] as const;

/**
 * Whether this role may change configuration, catalog, keys or billing.
 *
 * Shopify staff who are not the store's account owner are provisioned as
 * `staff`, because Shopify exposes no per-staff permission list to an app.
 * They read the dashboard and are refused every write below.
 */
export function canManage(role?: string | null): boolean {
  return MANAGE_ROLES.includes((role || '') as (typeof MANAGE_ROLES)[number]);
}

/**
 * Why this surface is read-only, in the terms that apply to this account.
 *
 * Two different accounts land here and they need opposite advice. A Shopify
 * `staff` member is not the owner and never will be, so the answer is to ask
 * someone. A web signup sits on `user` until a subscription activates and
 * `BillingService` promotes them — they *are* the owner, so telling them to
 * ask one is nonsense.
 */
export function readOnlyReason(role?: string | null): string {
  if (role === 'user') {
    return 'Activate a plan to configure your agent. Your account gets full access as soon as the subscription is active.';
  }

  return 'Your account has view-only access to this store. Ask the store owner to make changes.';
}

/** Copy for a surface that does not know the role. */
export const READ_ONLY_REASON = readOnlyReason(null);
