import { Test, TestingModule } from '@nestjs/testing';
import { AiToolsExecutor } from './ai-tools.executor';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';
import { OrdersService } from '../../orders/orders.service';
import { AgentConfigService } from '../../agent-config/agent-config.service';
import { getModelToken } from '@nestjs/mongoose';
import { Business } from '../../users/schemas/business.schema';

describe('AiToolsExecutor', () => {
  let executor: AiToolsExecutor;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AiToolsExecutor,
        {
          provide: ProductsService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              _id: 'prod_123',
              name: 'Test Audio Headset',
              price: 150,
              stockQuantity: 10,
              availability: 'in_stock',
            }),
            verifyLive: jest.fn().mockResolvedValue({
              _id: 'prod_123',
              name: 'Test Audio Headset',
              price: 150,
              stockQuantity: 10,
              availability: 'in_stock',
            }),
            verifyLiveBatch: jest.fn().mockResolvedValue([
              {
                _id: 'prod_123',
                name: 'Test Audio Headset',
                price: 150,
                stockQuantity: 10,
                availability: 'in_stock',
              },
            ]),
            verifyLiveDocs: jest.fn().mockImplementation((_biz, docs) =>
              Promise.resolve(docs.map((d: any) => ({ ...d, isLowStock: false }))),
            ),
            findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
          },
        },
        {
          provide: RagService,
          useValue: {
            searchCombined: jest.fn().mockResolvedValue({
              products: [{ id: 'prod_123' }],
              fallbackTriggered: false,
            }),
            searchKnowledge: jest.fn().mockResolvedValue({ results: [] }),
          },
        },
        {
          provide: KnowledgeService,
          useValue: { findAll: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(null),
              set: jest.fn().mockResolvedValue('OK'),
              del: jest.fn().mockResolvedValue(1),
            }),
          },
        },
        {
          provide: EventsService,
          useValue: { logEvent: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: OrdersService,
          useValue: {
            create: jest.fn().mockResolvedValue({
              orderNumber: 'ORD-2026-000001',
              totalAmount: 150,
              status: 'pending',
            }),
          },
        },
        {
          provide: AgentConfigService,
          useValue: {
            getConfig: jest.fn().mockResolvedValue({
              config: { brandVoiceDescription: 'Test assistant' },
              playbook: { mentionLowStockUrgency: true },
            }),
          },
        },
      ],
    }).compile();

    executor = module.get<AiToolsExecutor>(AiToolsExecutor);
  });

  it('should execute find_products tool with live verification', async () => {
    const res = await executor.executeTool('biz_1', 'sess_1', 'find_products', {
      query: 'headphones',
    });
    expect(res.success).toBe(true);
    expect(res.products.length).toBe(1);
    expect(res.products[0].name).toBe('Test Audio Headset');
  });

  describe('find_products latency paths', () => {
    let products: any;
    let rag: any;
    let agentConfig: any;

    beforeEach(() => {
      products = module.get(ProductsService);
      rag = module.get(RagService);
      agentConfig = module.get(AgentConfigService);
    });

    it('reuses the documents RAG already hydrated instead of re-reading them by id', async () => {
      rag.searchCombined.mockResolvedValue({
        products: [
          {
            entityId: 'prod_123',
            data: {
              _id: 'prod_123',
              name: 'Test Audio Headset',
              price: 150,
              stockQuantity: 10,
              availability: 'in_stock',
            },
          },
        ],
        knowledge: [],
        fallbackTriggered: false,
        fallbackTier: 'none',
      });

      const res = await executor.executeTool('biz_1', 'sess_1', 'find_products', {
        query: 'headphones',
      });

      expect(res.products[0].name).toBe('Test Audio Headset');
      expect(products.verifyLiveDocs).toHaveBeenCalledTimes(1);
      expect(products.verifyLiveBatch).not.toHaveBeenCalled();
    });

    it('answers a confident keyword match without waiting for the semantic search', async () => {
      let ragSettled = false;
      rag.searchCombined.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              ragSettled = true;
              resolve({ products: [], knowledge: [], fallbackTriggered: true, fallbackTier: 'none' });
            }, 50);
          }),
      );
      products.findAll.mockResolvedValue({
        items: [
          {
            _id: 'prod_777',
            name: 'Merino Wool Scarf',
            price: 40,
            stockQuantity: 8,
            availability: 'in_stock',
          },
        ],
        total: 1,
      });

      const res = await executor.executeTool('biz_1', 'sess_1', 'find_products', {
        query: 'wool scarf',
      });

      expect(res.fallbackTier).toBe('keyword_fast_path');
      expect(res.products[0].name).toBe('Merino Wool Scarf');
      // The embedding round trip is still in flight — the shopper did not wait for it.
      expect(ragSettled).toBe(false);
    });

    it('falls through to the semantic search when the keyword hit is only partial', async () => {
      products.findAll.mockResolvedValue({
        items: [
          {
            _id: 'prod_777',
            name: 'Cotton Scarf',
            price: 40,
            stockQuantity: 8,
            availability: 'in_stock',
          },
        ],
        total: 1,
      });

      const res = await executor.executeTool('biz_1', 'sess_1', 'find_products', {
        query: 'wool scarf',
      });

      // 'wool' is absent from the name, so the vector search still gets its say.
      expect(res.fallbackTier).not.toBe('keyword_fast_path');
      expect(rag.searchCombined).toHaveBeenCalled();
    });

    it('reads the low-stock urgency playbook flag once per tenant, not once per call', async () => {
      await executor.executeTool('biz_cached', 'sess_1', 'find_products', { query: 'headphones' });
      await executor.executeTool('biz_cached', 'sess_1', 'find_products', { query: 'headphones' });

      expect(agentConfig.getConfig).toHaveBeenCalledTimes(1);
    });
  });
  describe('add_to_cart variant handling', () => {
    let products: any;

    const shopifyProduct = (variants: any[], optionNames: string[] = ['Size']) => ({
      _id: { toString: () => 'prod_123' },
      name: 'Test Audio Headset',
      price: 150,
      images: ['https://cdn.example/headset.jpg'],
      attributes: {
        shopify: { variants, optionNames, requiresVariantSelection: variants.length > 1 },
      },
    });

    beforeEach(() => {
      products = module.get(ProductsService);
    });

    it('asks which option the shopper wants instead of guessing a variant', async () => {
      products.verifyLive.mockResolvedValue(
        shopifyProduct([
          { variantId: '1', title: 'Small', price: 150, available: true },
          { variantId: '2', title: 'Medium', price: 150, available: true },
        ]),
      );

      const res = await executor.executeTool('biz_1', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
      });

      expect(res.success).toBe(false);
      expect(res.needsVariantSelection).toBe(true);
      expect(res.variants.map((v: any) => v.variantId)).toEqual(['1', '2']);
      expect(res.action).toBeUndefined();
    });

    it('offers only the variants that are actually purchasable', async () => {
      products.verifyLive.mockResolvedValue(
        shopifyProduct([
          { variantId: '1', title: 'Small', price: 150, available: false },
          { variantId: '2', title: 'Medium', price: 150, available: true },
        ]),
      );

      const res = await executor.executeTool('biz_1', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
      });

      expect(res.variants.map((v: any) => v.variantId)).toEqual(['2']);
    });

    it('returns a storefront action for a single-variant product without being asked', async () => {
      products.verifyLive.mockResolvedValue(
        shopifyProduct([{ variantId: '77', title: 'Default', price: 150, available: true }], []),
      );

      const res = await executor.executeTool('biz_1', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
        quantity: 2,
      });

      expect(res.success).toBe(true);
      expect(res.action).toEqual({
        type: 'shopify_add_to_cart',
        variantId: '77',
        quantity: 2,
        product: {
          id: 'prod_123',
          name: 'Test Audio Headset',
          price: 150,
          image: 'https://cdn.example/headset.jpg',
        },
      });
      expect(res.cart.items[0].variantId).toBe('77');
    });

    it('honours the variant the shopper chose', async () => {
      products.verifyLive.mockResolvedValue(
        shopifyProduct([
          { variantId: '1', title: 'Small', price: 150, available: true },
          { variantId: '2', title: 'Medium', price: 150, available: true },
        ]),
      );

      const res = await executor.executeTool('biz_1', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
        variantId: '2',
      });

      expect(res.action.variantId).toBe('2');
    });

    it('asks again rather than sending Shopify a variant id the product does not have', async () => {
      products.verifyLive.mockResolvedValue(
        shopifyProduct([
          { variantId: '1', title: 'Small', price: 150, available: true },
          { variantId: '2', title: 'Medium', price: 150, available: true },
        ]),
      );

      const res = await executor.executeTool('biz_1', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
        variantId: '999',
      });

      expect(res.needsVariantSelection).toBe(true);
    });

    it('still fills the server-side cart for a product with no Shopify variants', async () => {
      products.verifyLive.mockResolvedValue({
        _id: { toString: () => 'prod_123' },
        name: 'Test Audio Headset',
        price: 150,
        attributes: {},
      });

      const res = await executor.executeTool('biz_1', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
      });

      expect(res.success).toBe(true);
      expect(res.cart.items).toHaveLength(1);
      // No variant id means no storefront cart call the widget could make.
      expect(res.action).toBeUndefined();
    });

    it('keeps two variants of one product as separate cart lines', async () => {
      const redis: any = module.get(RedisService).getClient();
      products.verifyLive.mockResolvedValue(
        shopifyProduct([
          { variantId: '1', title: 'Small', price: 150, available: true },
          { variantId: '2', title: 'Medium', price: 150, available: true },
        ]),
      );

      const first = await executor.executeTool('biz_1', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
        variantId: '1',
      });
      redis.get.mockResolvedValue(JSON.stringify(first.cart));

      const second = await executor.executeTool('biz_1', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
        variantId: '2',
      });

      expect(second.cart.items).toHaveLength(2);
    });
  });

  describe('get_product_details', () => {
    it('lists variant ids so the model has something to offer the shopper', async () => {
      (module.get(ProductsService).verifyLive as jest.Mock).mockResolvedValue({
        _id: { toString: () => 'prod_123' },
        name: 'Test Audio Headset',
        price: 150,
        attributes: {
          shopify: {
            optionNames: ['Size'],
            variants: [
              { variantId: '1', title: 'Small', price: 150, available: true },
              { variantId: '2', title: 'Medium', price: 160, available: false },
            ],
          },
        },
      });

      const res = await executor.executeTool('biz_1', 'sess_1', 'get_product_details', {
        productId: 'prod_123',
      });

      expect(res.product.optionNames).toEqual(['Size']);
      expect(res.product.variants).toHaveLength(2);
    });

    it('omits the variant block for a single-variant product', async () => {
      const res = await executor.executeTool('biz_1', 'sess_1', 'get_product_details', {
        productId: 'prod_123',
      });

      expect(res.product.variants).toBeUndefined();
    });
  });
  describe('Shopify tenants: the storefront cart is the only cart that sells', () => {
    let shopifyExecutor: AiToolsExecutor;
    let orders: any;
    let redis: any;
    let cartStore: Record<string, string>;

    const variantProduct = {
      _id: { toString: () => 'prod_123' },
      name: 'Test Audio Headset',
      price: 150,
      images: [],
      attributes: {
        shopify: {
          handle: 'test-audio-headset',
          optionNames: [],
          variants: [{ variantId: '77', title: 'Default', price: 150, available: true }],
        },
      },
    };

    const buildExecutor = async (business: any, product: any = variantProduct) => {
      cartStore = {};
      redis = {
        get: jest.fn().mockImplementation((key: string) => Promise.resolve(cartStore[key] ?? null)),
        set: jest.fn().mockImplementation((key: string, value: string) => {
          cartStore[key] = value;
          return Promise.resolve('OK');
        }),
        del: jest.fn().mockImplementation((key: string) => {
          delete cartStore[key];
          return Promise.resolve(1);
        }),
      };
      orders = {
        create: jest.fn().mockResolvedValue({
          orderNumber: 'ORD-2026-000001',
          totalAmount: 150,
          status: 'pending',
        }),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          AiToolsExecutor,
          { provide: ProductsService, useValue: { verifyLive: jest.fn().mockResolvedValue(product) } },
          { provide: RagService, useValue: { searchCombined: jest.fn(), searchKnowledge: jest.fn() } },
          { provide: KnowledgeService, useValue: { findAll: jest.fn() } },
          { provide: RedisService, useValue: { getClient: () => redis } },
          { provide: EventsService, useValue: { logEvent: jest.fn().mockResolvedValue({}) } },
          { provide: OrdersService, useValue: orders },
          { provide: AgentConfigService, useValue: { getConfig: jest.fn().mockResolvedValue({}) } },
          {
            provide: getModelToken(Business.name),
            useValue: {
              findById: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(business),
                  }),
                }),
              }),
            },
          },
        ],
      }).compile();

      return testModule.get<AiToolsExecutor>(AiToolsExecutor);
    };

    it('refuses to place an ORA order behind the storefront checkout', async () => {
      shopifyExecutor = await buildExecutor({ platform: 'shopify' });

      await shopifyExecutor.executeTool('biz_shop', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
      });
      const res = await shopifyExecutor.executeTool('biz_shop', 'sess_1', 'place_order', {});

      expect(res.success).toBe(false);
      expect(res.handoffToStorefrontCheckout).toBe(true);
      expect(res.action).toEqual({
        type: 'navigate',
        destination: '/cart',
        reason: 'Complete the purchase in the storefront checkout',
      });
      // The one thing that must never happen: a second sale of the same items.
      expect(orders.create).not.toHaveBeenCalled();
    });

    it('still places orders itself for a tenant with no Shopify storefront', async () => {
      const executorNoShop = await buildExecutor({ platform: 'woocommerce' });

      await executorNoShop.executeTool('biz_woo', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
      });
      const res = await executorNoShop.executeTool('biz_woo', 'sess_1', 'place_order', {});

      expect(res.success).toBe(true);
      expect(orders.create).toHaveBeenCalledTimes(1);
    });

    it('treats an installed embedded app as Shopify even when platform is unset', async () => {
      const executorInstalled = await buildExecutor({
        shopifyShopDomain: 'demo-store.myshopify.com',
        shopifyInstalledAt: new Date('2026-09-01'),
      });

      const res = await executorInstalled.executeTool('biz_shop', 'sess_1', 'place_order', {});
      expect(res.handoffToStorefrontCheckout).toBe(true);
    });

    it('returns to owning the cart once the app is uninstalled', async () => {
      const executorUninstalled = await buildExecutor({
        shopifyShopDomain: 'demo-store.myshopify.com',
        shopifyInstalledAt: new Date('2026-09-01'),
        shopifyUninstalledAt: new Date('2026-09-15'),
      });

      await executorUninstalled.executeTool('biz_shop', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
      });
      const res = await executorUninstalled.executeTool('biz_shop', 'sess_1', 'place_order', {});

      expect(res.success).toBe(true);
      expect(orders.create).toHaveBeenCalledTimes(1);
    });

    it('marks the cart with who owns it', async () => {
      shopifyExecutor = await buildExecutor({ platform: 'shopify' });

      const res = await shopifyExecutor.executeTool('biz_shop', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
      });

      expect(res.cart.authority).toBe('shopify');
    });

    it('sends the shopper to the product page when a product has no variant to add', async () => {
      shopifyExecutor = await buildExecutor(
        { platform: 'shopify' },
        {
          _id: { toString: () => 'prod_123' },
          name: 'Unsynced Item',
          price: 20,
          attributes: { shopify: { handle: 'unsynced-item', variants: [] } },
        },
      );

      const res = await shopifyExecutor.executeTool('biz_shop', 'sess_1', 'add_to_cart', {
        productId: 'prod_123',
      });

      expect(res.success).toBe(false);
      expect(res.action.destination).toBe('/products/unsynced-item');
      // Nothing was written, so ORA is not holding an item the store has never seen.
      expect(redis.set).not.toHaveBeenCalled();
    });

    describe('syncStorefrontCart', () => {
      beforeEach(async () => {
        shopifyExecutor = await buildExecutor({ platform: 'shopify' });
        await shopifyExecutor.executeTool('biz_shop', 'sess_1', 'add_to_cart', {
          productId: 'prod_123',
        });
      });

      it('drops the line the storefront rejected and tells the model to correct itself', async () => {
        const correction = await shopifyExecutor.syncStorefrontCart('biz_shop', 'sess_1', {
          ok: false,
          variantId: '77',
          reason: 'sold out',
        });

        expect(correction).toContain('Test Audio Headset');
        expect(correction).toContain('sold out');
        expect(JSON.parse(cartStore['cart:conv:sess_1']).items).toHaveLength(0);
      });

      it('keeps the line and says nothing when the storefront accepted it', async () => {
        const correction = await shopifyExecutor.syncStorefrontCart('biz_shop', 'sess_1', {
          ok: true,
          variantId: '77',
        });

        expect(correction).toBeNull();
        const items = JSON.parse(cartStore['cart:conv:sess_1']).items;
        expect(items).toHaveLength(1);
        expect(items[0].mirroredToStorefront).toBe(true);
      });

      it('ignores a report for a line the cart does not have', async () => {
        const correction = await shopifyExecutor.syncStorefrontCart('biz_shop', 'sess_1', {
          ok: false,
          variantId: '999',
        });

        expect(correction).toBeNull();
        expect(JSON.parse(cartStore['cart:conv:sess_1']).items).toHaveLength(1);
      });
    });
  });
});
