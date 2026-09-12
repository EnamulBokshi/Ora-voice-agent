import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { ShopifySyncProcessor } from './shopify-sync.processor';
import { ProductsService } from '../products/products.service';
import { VectorStoreService } from '../vector/vector-store.service';
import { Business } from '../users/schemas/business.schema';
import { Product } from '../products/schemas/product.schema';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { shopifyTokenServiceProvider } from '../common/shopify-token/shopify-token.testing';

const SHOP = 'demo-store.myshopify.com';

const shopifyProduct = (id: number, inventory = 5) => ({
  id,
  title: `Product ${id}`,
  body_html: `<p>Description ${id}</p>`,
  product_type: 'Widgets',
  vendor: 'Acme',
  images: [{ src: `https://cdn.test/${id}.jpg` }],
  variants: [{ price: '19.99', inventory_quantity: inventory }],
});

/**
 * `ProductsService.batchSync` does a `bulkWrite` and a RAG cache invalidation
 * and nothing else, so the embedding step here is not optional. The unit of
 * work is the page, not the product — the webhook path's per-product shape
 * would mean an extra query and an embedding call for every item in a catalog.
 */
describe('ShopifySyncProcessor', () => {
  let processor: ShopifySyncProcessor;
  let productsService: { batchSync: jest.Mock };
  let vectorStore: { upsertVector: jest.Mock };
  let productModel: { find: jest.Mock };
  let fetchMock: jest.Mock;

  const job = (data: unknown) =>
    ({ data, updateProgress: jest.fn().mockResolvedValue(undefined) }) as any;

  const page = (products: unknown[], nextPageInfo?: string) => ({
    ok: true,
    status: 200,
    headers: {
      get: (key: string) =>
        key.toLowerCase() === 'link' && nextPageInfo
          ? `<https://${SHOP}/admin/api/x/products.json?page_info=${nextPageInfo}>; rel="next"`
          : null,
    },
    json: async () => ({ products }),
  });

  beforeEach(async () => {
    productsService = {
      batchSync: jest.fn().mockResolvedValue({ upsertedCount: 0 }),
    };
    vectorStore = { upsertVector: jest.fn().mockResolvedValue(undefined) };

    productModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: { toString: () => 'p1' },
              name: 'Product 1',
              description: 'Description 1',
              category: 'Widgets',
              price: 19.99,
              nativeProductId: '1',
            },
          ]),
        }),
      }),
    };

    const businessModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'biz-1',
            shopifyAccessToken: EncryptionUtil.encrypt('shpat_token'),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifySyncProcessor,
        shopifyTokenServiceProvider(),
        { provide: ProductsService, useValue: productsService },
        { provide: VectorStoreService, useValue: vectorStore },
        { provide: getModelToken(Business.name), useValue: businessModel },
        { provide: getModelToken(Product.name), useValue: productModel },
      ],
    }).compile();

    processor = module.get<ShopifySyncProcessor>(ShopifySyncProcessor);

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('upserts a page at a time rather than a product at a time', async () => {
    fetchMock.mockResolvedValueOnce(page([shopifyProduct(1), shopifyProduct(2)]));

    const result = await processor.process(
      job({ businessId: 'biz-1', shopDomain: SHOP }),
    );

    expect(result.products).toBe(2);
    // One call for the whole page, not one per product.
    expect(productsService.batchSync).toHaveBeenCalledTimes(1);
    expect(productsService.batchSync.mock.calls[0][1].products).toHaveLength(2);
  });

  it('follows the Link header cursor to the next page', async () => {
    fetchMock
      .mockResolvedValueOnce(page([shopifyProduct(1)], 'cursor-2'))
      .mockResolvedValueOnce(page([shopifyProduct(2)]));

    const result = await processor.process(
      job({ businessId: 'biz-1', shopDomain: SHOP }),
    );

    expect(result.pages).toBe(2);
    expect(fetchMock.mock.calls[1][0]).toContain('page_info=cursor-2');
  });

  it('embeds the page after upserting it', async () => {
    fetchMock.mockResolvedValueOnce(page([shopifyProduct(1)]));

    const result = await processor.process(
      job({ businessId: 'biz-1', shopDomain: SHOP }),
    );

    expect(vectorStore.upsertVector).toHaveBeenCalledTimes(1);
    expect(result.embedded).toBe(1);
  });

  it('derives availability from inventory, not Shopify publication status', async () => {
    fetchMock.mockResolvedValueOnce(page([shopifyProduct(1, 0)]));

    await processor.process(job({ businessId: 'biz-1', shopDomain: SHOP }));

    const [product] = productsService.batchSync.mock.calls[0][1].products;
    expect(product.availability).toBe('out_of_stock');
  });

  it('strips HTML from the description', async () => {
    fetchMock.mockResolvedValueOnce(page([shopifyProduct(1)]));

    await processor.process(job({ businessId: 'biz-1', shopDomain: SHOP }));

    const [product] = productsService.batchSync.mock.calls[0][1].products;
    expect(product.description).toBe('Description 1');
  });

  it('retries a 429 instead of failing the import', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => '0' },
        json: async () => ({}),
      })
      .mockResolvedValueOnce(page([shopifyProduct(1)]));

    const result = await processor.process(
      job({ businessId: 'biz-1', shopDomain: SHOP }),
    );

    expect(result.products).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps going when one product fails to embed', async () => {
    fetchMock.mockResolvedValueOnce(page([shopifyProduct(1)]));
    vectorStore.upsertVector.mockRejectedValue(new Error('embedding down'));

    const result = await processor.process(
      job({ businessId: 'biz-1', shopDomain: SHOP }),
    );

    // The product is still upserted and searchable through the non-vector path.
    expect(result.products).toBe(1);
    expect(result.embedded).toBe(0);
  });

  it('skips the sync when the tenant has no access token', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopifySyncProcessor,
        shopifyTokenServiceProvider(),
        { provide: ProductsService, useValue: productsService },
        { provide: VectorStoreService, useValue: vectorStore },
        {
          provide: getModelToken(Business.name),
          useValue: {
            findById: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({ _id: 'biz-1' }),
              }),
            }),
          },
        },
        { provide: getModelToken(Product.name), useValue: productModel },
      ],
    }).compile();

    const tokenless = module.get<ShopifySyncProcessor>(ShopifySyncProcessor);
    const result = await tokenless.process(
      job({ businessId: 'biz-1', shopDomain: SHOP }),
    );

    expect(result).toEqual({ pages: 0, products: 0, embedded: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
