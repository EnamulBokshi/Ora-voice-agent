import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from './products.service';
import { RedisService } from '../common/redis/redis.service';
import { Product } from './schemas/product.schema';
import { DomainException } from '../common/exceptions/domain.exception';

describe('ProductsService', () => {
  let service: ProductsService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('5'),
          },
        },
        {
          provide: getModelToken(Product.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            bulkWrite: jest.fn(),
            countDocuments: jest.fn(),
            deleteOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should query multiple products in a single database roundtrip with findManyByIds', async () => {
    const mockProducts = [
      { _id: '64b1f2a3c9e77b001f2a3b4c', name: 'Product A', price: 100 },
      { _id: '64b1f2a3c9e77b001f2a3b4d', name: 'Product B', price: 200 },
    ];
    const productModel = moduleRef.get(getModelToken(Product.name));
    productModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockProducts),
    });

    const result = await service.findManyByIds('64b1f2a3c9e77b001f2a3b4e', [
      '64b1f2a3c9e77b001f2a3b4c',
      '64b1f2a3c9e77b001f2a3b4d',
    ]);
    expect(result).toHaveLength(2);
    expect(productModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
      }),
    );
  });

  it('should verify live batch correctly', async () => {
    const mockProducts = [
      {
        _id: '64b1f2a3c9e77b001f2a3b4c',
        name: 'Product A',
        price: 100,
        stockQuantity: 3,
        availability: 'in_stock',
      },
    ];
    const productModel = moduleRef.get(getModelToken(Product.name));
    productModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockProducts),
    });

    const result = await service.verifyLiveBatch('64b1f2a3c9e77b001f2a3b4e', [
      '64b1f2a3c9e77b001f2a3b4c',
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].isLowStock).toBe(true); // 3 <= lowStockThreshold (5)
  });

  describe('verifyLiveDocs', () => {
    it('overlays live stock without re-reading the documents from Mongo', async () => {
      const productModel = moduleRef.get(getModelToken(Product.name));
      productModel.find.mockClear();

      const result = await service.verifyLiveDocs('64b1f2a3c9e77b001f2a3b4e', [
        {
          _id: '64b1f2a3c9e77b001f2a3b4c',
          name: 'Product A',
          price: 100,
          stockQuantity: 3,
          availability: 'in_stock',
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].isLowStock).toBe(true); // 3 <= lowStockThreshold (5)
      expect(productModel.find).not.toHaveBeenCalled();
    });

    it('returns an empty list for no documents', async () => {
      await expect(service.verifyLiveDocs('64b1f2a3c9e77b001f2a3b4e', [])).resolves.toEqual([]);
    });

    it('reads every cached stock entry in one Redis round trip', async () => {
      const mget = jest.fn().mockResolvedValue([
        JSON.stringify({ price: 88, stockQuantity: 2, availability: 'in_stock', isLowStock: true }),
        null,
      ]);
      const get = jest.fn();
      const redisModule = await Test.createTestingModule({
        providers: [
          ProductsService,
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('5') } },
          { provide: getModelToken(Product.name), useValue: { find: jest.fn() } },
          {
            provide: RedisService,
            useValue: {
              getClient: () => ({ mget, get, set: jest.fn().mockResolvedValue('OK') }),
            },
          },
        ],
      }).compile();

      const redisService = redisModule.get<ProductsService>(ProductsService);
      const result = await redisService.verifyLiveDocs('64b1f2a3c9e77b001f2a3b4e', [
        { _id: 'a', name: 'Cached', price: 100, stockQuantity: 9, availability: 'in_stock' },
        { _id: 'b', name: 'Uncached', price: 50, stockQuantity: 9, availability: 'in_stock' },
      ]);

      expect(mget).toHaveBeenCalledTimes(1);
      expect(get).not.toHaveBeenCalled();
      // Cached entry wins over the document; the miss falls back to the document.
      expect(result[0].price).toBe(88);
      expect(result[0].isLowStock).toBe(true);
      expect(result[1].price).toBe(50);
      expect(result[1].isLowStock).toBe(false);
    });
  });

  describe('verifyLive', () => {
    const businessId = '64b1f2a3c9e77b001f2a3b4e';
    const objectId = '64b1f2a3c9e77b001f2a3b4c';

    /** Builds a mock product document whose save() can be asserted on. */
    const mockProductDoc = (overrides: Record<string, any> = {}) => ({
      _id: objectId,
      name: 'Product A',
      price: 100,
      stockQuantity: 3,
      availability: 'in_stock',
      lastVerifiedAt: null,
      confidenceScore: 0.5,
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
      toObject: jest.fn().mockReturnValue({ _id: objectId, name: 'Product A' }),
      ...overrides,
    });

    it('does not write to the database for a read-only verification', async () => {
      const doc = mockProductDoc();
      const productModel = moduleRef.get(getModelToken(Product.name));
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.verifyLive(businessId, objectId);

      // A price/stock question on the voice hot path must cost zero Mongo writes.
      expect(doc.save).not.toHaveBeenCalled();
      expect(result.isLowStock).toBe(true); // 3 <= threshold (5)
      expect(result.price).toBe(100);
    });

    it('still persists when the caller supplies new live values', async () => {
      const doc = mockProductDoc();
      const productModel = moduleRef.get(getModelToken(Product.name));
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.verifyLive(businessId, objectId, {
        price: 250,
        stockQuantity: 9,
      });

      expect(doc.save).toHaveBeenCalledTimes(1);
      expect(result.price).toBe(250);
      expect(result.stockQuantity).toBe(9);
      expect(result.isLowStock).toBe(false); // 9 > threshold (5)
      expect(doc.lastVerifiedAt).toBeInstanceOf(Date);
      expect(doc.confidenceScore).toBe(1.0);
    });
  });

  describe('remove', () => {
    const businessId = '64b1f2a3c9e77b001f2a3b4e';
    const objectId = '64b1f2a3c9e77b001f2a3b4c';

    it('deletes by nativeProductId without a cast error', async () => {
      const productModel = moduleRef.get(getModelToken(Product.name));
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: objectId,
          nativeProductId: 'shopify_prod_1001',
        }),
      });
      productModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await service.remove(businessId, 'shopify_prod_1001');

      expect(result.message).toBe('Product deleted successfully.');
      // The resolved _id is deleted, never the caller's nativeProductId.
      expect(productModel.deleteOne).toHaveBeenCalledWith({
        _id: objectId,
        businessId,
      });
    });

    it('deletes by Mongo _id', async () => {
      const productModel = moduleRef.get(getModelToken(Product.name));
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: objectId }),
      });
      productModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      await expect(service.remove(businessId, objectId)).resolves.toEqual({
        message: 'Product deleted successfully.',
      });
    });

    it('raises PRODUCT_NOT_FOUND for an unknown identifier', async () => {
      const productModel = moduleRef.get(getModelToken(Product.name));
      productModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(businessId, 'nope')).rejects.toThrow(
        DomainException,
      );
      expect(productModel.deleteOne).not.toHaveBeenCalled();
    });
  });

  it('filters by brand, which is a real stored field', async () => {
    const productModel = moduleRef.get(getModelToken(Product.name));
    productModel.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({ exec: jest.fn().mockResolvedValue([]) }),
        }),
      }),
    });
    productModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.findAll('64b1f2a3c9e77b001f2a3b4e', { brand: 'Nordic Weave' });

    expect(productModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: { $regex: /^Nordic Weave$/i },
      }),
    );
  });
});
