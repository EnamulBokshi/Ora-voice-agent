import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { DualAuthGuard } from '../common/guards/dual-auth.guard';
import { ProductAvailability, SourceTier } from './schemas/product.schema';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockProductsService: any;

  const mockBusinessId = '671234567890123456789012';
  const mockUser: any = {
    sub: 'admin_user_1',
    businessId: mockBusinessId,
    role: 'owner',
  };

  beforeEach(async () => {
    mockProductsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      batchSync: jest.fn(),
      manualOverride: jest.fn(),
      verifyLive: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should delegate findAll with user.businessId and query', async () => {
    mockProductsService.findAll.mockResolvedValue({ items: [], pagination: {} });
    const query = { page: 1, limit: 10 };

    const result = await controller.findAll(mockUser, query);

    expect(mockProductsService.findAll).toHaveBeenCalledWith(mockBusinessId, query);
    expect(result.items).toBeDefined();
  });

  it('should delegate findOne with user.businessId and id', async () => {
    mockProductsService.findOne.mockResolvedValue({ _id: 'prod_1', name: 'Item' });

    const result = await controller.findOne(mockUser, 'prod_1');

    expect(mockProductsService.findOne).toHaveBeenCalledWith(mockBusinessId, 'prod_1');
    expect(result.name).toBe('Item');
  });

  it('should delegate create with user.businessId and dto', async () => {
    const dto = {
      nativeProductId: 'shopify_prod_99',
      name: 'Sneakers',
      price: 120,
      stockQuantity: 15,
      availability: ProductAvailability.IN_STOCK,
      sourceTier: SourceTier.TIER1_CONNECTOR,
    };
    mockProductsService.create.mockResolvedValue({ _id: 'prod_created', ...dto });

    const result = await controller.create(mockUser, dto);

    expect(mockProductsService.create).toHaveBeenCalledWith(mockBusinessId, dto);
    expect(result._id).toBe('prod_created');
  });

  it('should delegate batchSync with user.businessId and dto', async () => {
    const dto = {
      sourceTier: SourceTier.TIER1_CONNECTOR,
      products: [
        {
          nativeProductId: 'shopify_prod_1',
          name: 'Watch',
          price: 250,
          stockQuantity: 5,
        },
      ],
    };
    mockProductsService.batchSync.mockResolvedValue({ syncedCount: 1 });

    const result = await controller.batchSync(mockUser, dto);

    expect(mockProductsService.batchSync).toHaveBeenCalledWith(mockBusinessId, dto);
    expect(result.syncedCount).toBe(1);
  });

  it('should delegate manualOverride with user.businessId, id, and dto', async () => {
    const dto = { price: 199 };
    mockProductsService.manualOverride.mockResolvedValue({ _id: 'prod_1', price: 199 });

    const result = await controller.manualOverride(mockUser, 'prod_1', dto);

    expect(mockProductsService.manualOverride).toHaveBeenCalledWith(mockBusinessId, 'prod_1', dto);
    expect(result.price).toBe(199);
  });

  it('should delegate verifyLive with user.businessId, id, and liveData', async () => {
    const liveData = { price: 200, inStock: true };
    mockProductsService.verifyLive.mockResolvedValue({ _id: 'prod_1', verified: true });

    const result = await controller.verifyLive(mockUser, 'prod_1', liveData);

    expect(mockProductsService.verifyLive).toHaveBeenCalledWith(mockBusinessId, 'prod_1', liveData);
    expect(result.verified).toBe(true);
  });

  it('should delegate remove with user.businessId and id', async () => {
    mockProductsService.remove.mockResolvedValue({ message: 'Product deleted successfully.' });

    const result = await controller.remove(mockUser, 'prod_1');

    expect(mockProductsService.remove).toHaveBeenCalledWith(mockBusinessId, 'prod_1');
    expect(result.message).toContain('deleted');
  });
});
