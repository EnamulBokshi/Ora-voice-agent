import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { Customer } from './schemas/customer.schema';
import { Business } from '../users/schemas/business.schema';
import { Order } from '../orders/schemas/order.schema';
import { Conversation } from '../conversations/schemas/conversation.schema';
import { RedisService } from '../common/redis/redis.service';
import { IdentityVerificationUtil } from '../common/utils/identity-verification.util';

describe('CustomersService', () => {
  let service: CustomersService;

  const mockCustomerModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: 'cust_mock_123',
    save: jest.fn().mockResolvedValue({
      ...dto,
      _id: 'cust_mock_123',
      businessId: 'biz_123',
      toObject: () => ({ ...dto, _id: 'cust_mock_123', businessId: 'biz_123' }),
    }),
  }));

  mockCustomerModel.findOne = jest.fn();
  mockCustomerModel.find = jest.fn();
  mockCustomerModel.findById = jest.fn();
  mockCustomerModel.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
  mockCustomerModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });

  const mockBusinessModel = {
    findById: jest.fn(),
  };

  const mockOrderModel = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };

  const mockConversationModel = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };

  const redisStore: Record<string, string> = {};
  const mockRedisClient = {
    get: jest.fn().mockImplementation((key: string) => Promise.resolve(redisStore[key] || null)),
    set: jest.fn().mockImplementation((key: string, val: string) => {
      redisStore[key] = val;
      return Promise.resolve('OK');
    }),
    del: jest.fn().mockImplementation((key: string) => {
      delete redisStore[key];
      return Promise.resolve(1);
    }),
  };

  const mockRedisService = {
    getClient: () => mockRedisClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
        { provide: getModelToken(Business.name), useValue: mockBusinessModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Conversation.name), useValue: mockConversationModel },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an anonymous ghost profile when no token or device matches', async () => {
    mockCustomerModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const res = await service.resolveOrCreateCustomer('biz_123', {
      sessionId: 'ses_1',
    });

    expect(res.isNewlyCreated).toBe(true);
    expect(res.customer.name).toBe('Guest Shopper');
    expect(res.customer.isAnonymous).toBe(true);
  });

  it('should resolve registered customer with valid HMAC token', async () => {
    const secret = 'biz_secret_xyz';
    const customerId = 'cust_reg_456';
    const token = IdentityVerificationUtil.generateCustomerToken(secret, customerId);

    mockBusinessModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_123',
          apiSecretHash: secret,
        }),
      }),
    });

    mockCustomerModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'cust_mongo_456',
        businessId: 'biz_123',
        name: 'Alice',
        externalCustomerId: customerId,
        isAnonymous: false,
        deviceIds: [],
        lastActiveAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: 'cust_mongo_456',
          businessId: 'biz_123',
          name: 'Alice',
          externalCustomerId: customerId,
          isAnonymous: false,
        }),
      }),
    });

    const res = await service.resolveOrCreateCustomer('biz_123', {
      customerToken: token,
      deviceId: 'dev_browser_1',
    });

    expect(res.isNewlyCreated).toBe(false);
    expect(res.customer.name).toBe('Alice');
    expect(res.customer.isAnonymous).toBe(false);
  });

  it('should follow merge pointer when resolving device ID and self-heal', async () => {
    const mergedAnonDoc = {
      _id: 'anon_1',
      businessId: 'biz_123',
      isMerged: true,
      mergedIntoCustomerId: 'reg_2',
      deviceIds: ['dev_123'],
    };

    const targetRegDoc = {
      _id: 'reg_2',
      businessId: 'biz_123',
      isMerged: false,
      name: 'Bob',
      deviceIds: ['dev_original'],
      toObject: () => ({ _id: 'reg_2', name: 'Bob', businessId: 'biz_123' }),
    };

    mockCustomerModel.findOne
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mergedAnonDoc) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(targetRegDoc) });

    const resolved = await service.resolveCustomerByDeviceId('biz_123', 'dev_123');

    expect(resolved).toBeDefined();
    expect(resolved!._id).toBe('reg_2');
    expect(mockCustomerModel.updateOne).toHaveBeenCalledWith(
      { _id: 'reg_2' },
      { $addToSet: { deviceIds: 'dev_123' } },
    );
  });

  it('should stitch anonymous session into registered customer including cart merge', async () => {
    const anonCustomer = {
      _id: 'anon_1',
      businessId: 'biz_123',
      extractedPreferences: { color: 'blue' },
      deviceIds: ['dev_anon'],
    };

    const regCustomer = {
      _id: 'reg_1',
      businessId: 'biz_123',
      extractedPreferences: { size: 'L' },
      deviceIds: ['dev_reg'],
    };

    mockCustomerModel.findOne
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(anonCustomer) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(regCustomer) });

    // Seed Redis carts
    redisStore['cart:customer:anon_1'] = JSON.stringify({
      items: [{ productId: 'p1', quantity: 1, price: 20 }],
    });
    redisStore['cart:customer:reg_1'] = JSON.stringify({
      items: [{ productId: 'p1', quantity: 2, price: 20 }, { productId: 'p2', quantity: 1, price: 50 }],
    });

    await service.stitchCustomerAccounts('biz_123', 'anon_1', 'reg_1', 'ses_test');

    expect(mockOrderModel.updateMany).toHaveBeenCalledWith(
      { customerId: 'anon_1', businessId: 'biz_123' },
      expect.objectContaining({
        $set: expect.objectContaining({ customerId: 'reg_1' }),
      }),
    );

    expect(mockConversationModel.updateMany).toHaveBeenCalledWith(
      { customerId: 'anon_1', businessId: 'biz_123' },
      { $set: { customerId: 'reg_1' } },
    );

    // Verify merged cart
    const mergedCart = JSON.parse(redisStore['cart:customer:reg_1']);
    expect(mergedCart.items).toHaveLength(2);
    const p1 = mergedCart.items.find((i: any) => i.productId === 'p1');
    expect(p1.quantity).toBe(3); // 1 + 2
  });
});
