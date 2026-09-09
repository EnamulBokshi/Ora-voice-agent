import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from './products.service';
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
