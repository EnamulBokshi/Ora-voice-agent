/**
 * Variant extraction for Shopify-sourced products.
 *
 * Shopify carts are keyed by variant id, never by product id: POST /cart/add.js with a
 * product id answers 404. Catalog sync therefore has to carry each variant id through to
 * the product document, because the voice agent's add_to_cart tool has nothing else to
 * hand the storefront.
 *
 * Price, stock and availability on the Product document itself keep their existing
 * meaning (the first variant); this only adds the per-variant detail alongside them.
 */

export interface ShopifyVariantSummary {
  variantId: string;
  title: string;
  price: number;
  sku?: string;
  available: boolean;
  /** Option values in Shopify's own order, e.g. ['Medium', 'Black']. */
  options: string[];
}

export interface ShopifyVariantAttributes {
  /** Storefront handle, so the agent can send a shopper to /products/<handle>. */
  handle?: string;
  /** Variant used when the shopper names no option. Absent when the product has none. */
  defaultVariantId?: string;
  variants: ShopifyVariantSummary[];
  /** True when the shopper must choose before the item can be added to a cart. */
  requiresVariantSelection: boolean;
  /** Option names in Shopify's order, e.g. ['Size', 'Color']. */
  optionNames: string[];
}

/**
 * Shopify's REST API returns numeric ids while GraphQL returns
 * `gid://shopify/ProductVariant/123`. The Ajax cart accepts only the numeric form.
 */
export function normalizeVariantId(rawId: unknown): string {
  return String(rawId ?? '').replace(/^gid:\/\/shopify\/ProductVariant\//, '');
}

/**
 * Whether a variant can be added to a cart right now.
 *
 * An untracked variant (`inventory_management` unset) is always purchasable, and a
 * tracked one with `inventory_policy: 'continue'` oversells deliberately, so neither may
 * be gated on inventory_quantity.
 */
function isVariantAvailable(variant: any): boolean {
  if (typeof variant.available === 'boolean') return variant.available;
  if (!variant.inventory_management) return true;
  if (variant.inventory_policy === 'continue') return true;
  return (variant.inventory_quantity || 0) > 0;
}

export function mapShopifyVariants(product: any): ShopifyVariantAttributes {
  const rawVariants: any[] = Array.isArray(product?.variants) ? product.variants : [];

  const variants: ShopifyVariantSummary[] = rawVariants
    .map((variant) => ({
      variantId: normalizeVariantId(variant.id),
      title: variant.title || 'Default',
      price: parseFloat(variant.price || '0') || 0,
      sku: variant.sku || undefined,
      available: isVariantAvailable(variant),
      options: [variant.option1, variant.option2, variant.option3].filter(
        (option): option is string => Boolean(option),
      ),
    }))
    .filter((variant) => Boolean(variant.variantId));

  const optionNames: string[] = Array.isArray(product?.options)
    ? product.options.map((option: any) => option?.name).filter(Boolean)
    : [];

  // Prefer a variant the shopper can actually buy as the default, so a single-variant
  // product that is sold out still reports its id rather than silently dropping it.
  const defaultVariant = variants.find((variant) => variant.available) || variants[0];

  return {
    handle: product?.handle || undefined,
    defaultVariantId: defaultVariant ? defaultVariant.variantId : undefined,
    variants,
    requiresVariantSelection: variants.length > 1,
    optionNames,
  };
}
