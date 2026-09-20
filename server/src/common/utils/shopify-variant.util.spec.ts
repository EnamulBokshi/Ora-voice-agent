import { mapShopifyVariants, normalizeVariantId } from './shopify-variant.util';

describe('shopify-variant.util', () => {
  describe('normalizeVariantId', () => {
    it('passes a REST numeric id through unchanged', () => {
      expect(normalizeVariantId(44910283)).toBe('44910283');
    });

    it('strips the GraphQL gid prefix the Ajax cart rejects', () => {
      expect(normalizeVariantId('gid://shopify/ProductVariant/44910283')).toBe('44910283');
    });
  });

  describe('mapShopifyVariants', () => {
    it('captures every variant id with its option values', () => {
      const result = mapShopifyVariants({
        options: [{ name: 'Size' }, { name: 'Color' }],
        variants: [
          {
            id: 1,
            title: 'Small / Black',
            price: '49.99',
            sku: 'SKU-S',
            option1: 'Small',
            option2: 'Black',
            inventory_management: 'shopify',
            inventory_quantity: 3,
          },
          {
            id: 2,
            title: 'Medium / Black',
            price: '54.99',
            option1: 'Medium',
            option2: 'Black',
            inventory_management: 'shopify',
            inventory_quantity: 0,
          },
        ],
      });

      expect(result.variants).toEqual([
        {
          variantId: '1',
          title: 'Small / Black',
          price: 49.99,
          sku: 'SKU-S',
          available: true,
          options: ['Small', 'Black'],
        },
        {
          variantId: '2',
          title: 'Medium / Black',
          price: 54.99,
          sku: undefined,
          available: false,
          options: ['Medium', 'Black'],
        },
      ]);
      expect(result.optionNames).toEqual(['Size', 'Color']);
      expect(result.requiresVariantSelection).toBe(true);
    });

    it('defaults to the first variant a shopper can actually buy', () => {
      const result = mapShopifyVariants({
        variants: [
          { id: 1, title: 'Sold out', price: '10', inventory_management: 'shopify', inventory_quantity: 0 },
          { id: 2, title: 'In stock', price: '10', inventory_management: 'shopify', inventory_quantity: 5 },
        ],
      });

      expect(result.defaultVariantId).toBe('2');
    });

    it('still reports a default when every variant is sold out', () => {
      const result = mapShopifyVariants({
        variants: [
          { id: 1, title: 'Only one', price: '10', inventory_management: 'shopify', inventory_quantity: 0 },
        ],
      });

      expect(result.defaultVariantId).toBe('1');
      expect(result.requiresVariantSelection).toBe(false);
    });

    it('treats untracked and oversellable inventory as purchasable', () => {
      const result = mapShopifyVariants({
        variants: [
          { id: 1, title: 'Untracked', price: '10', inventory_management: null, inventory_quantity: 0 },
          {
            id: 2,
            title: 'Oversells',
            price: '10',
            inventory_management: 'shopify',
            inventory_policy: 'continue',
            inventory_quantity: -4,
          },
        ],
      });

      expect(result.variants.map((v) => v.available)).toEqual([true, true]);
    });

    it('returns an empty set for a product with no variants', () => {
      const result = mapShopifyVariants({});
      expect(result.variants).toEqual([]);
      expect(result.defaultVariantId).toBeUndefined();
      expect(result.requiresVariantSelection).toBe(false);
    });
  });
});
