import { HttpStatus } from '@nestjs/common';
import { BootstrapRateLimitGuard } from './bootstrap-rate-limit.guard';
import { DomainException } from '../../common/exceptions/domain.exception';

describe('BootstrapRateLimitGuard', () => {
  let guard: BootstrapRateLimitGuard;
  let mockBusinessModel: any;
  let mockRedisClient: any;
  let mockRedisService: any;

  beforeEach(() => {
    mockBusinessModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'biz_123456789012345678901234',
          name: 'Acme Store',
          publishableKey: 'biz_live_valid_key',
          status: 'active',
        }),
      }),
    };

    mockRedisClient = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    guard = new BootstrapRateLimitGuard(mockBusinessModel, mockRedisService);
  });

  const createMockContext = (headers: Record<string, string> = {}, body: any = {}, ip: string = '127.0.0.1') => {
    const req: any = {
      headers,
      body,
      query: {},
      socket: { remoteAddress: ip },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should allow valid bootstrap requests and attach business to req', async () => {
    const context = createMockContext(
      { 'x-publishable-key': 'biz_live_valid_key' },
      {},
      '192.168.1.1',
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);

    const req = context.switchToHttp().getRequest();
    expect(req.business).toBeDefined();
    expect(req.business.name).toBe('Acme Store');
    expect(req.businessId).toBe('biz_123456789012345678901234');
  });

  it('should throw UNAUTHORIZED if publishable key is missing', async () => {
    const context = createMockContext({}, {});

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: 'MISSING_PUBLISHABLE_KEY',
      status: HttpStatus.UNAUTHORIZED,
    });
  });

  it('should throw UNAUTHORIZED if publishable key is invalid', async () => {
    mockBusinessModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const context = createMockContext({ 'x-publishable-key': 'biz_live_invalid' });

    await expect(guard.canActivate(context)).rejects.toThrow(DomainException);
  });

  it('should throw TOO_MANY_REQUESTS when IP burst limit is exceeded (>60 req/min)', async () => {
    mockRedisClient.incr.mockResolvedValue(65); // IP counter exceeds 60

    const context = createMockContext({ 'x-publishable-key': 'biz_live_valid_key' });

    let thrownError: any;
    try {
      await guard.canActivate(context);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(DomainException);
    expect(thrownError.code).toBe('IP_RATE_LIMIT_EXCEEDED');
    expect(thrownError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('should throw TOO_MANY_REQUESTS when tenant bootstrap limit is exceeded (>2000 req/min)', async () => {
    let callCount = 0;
    mockRedisClient.incr.mockImplementation(async () => {
      callCount++;
      return callCount === 1 ? 10 : 2005; // 1st is IP (10), 2nd is Tenant (2005)
    });

    const context = createMockContext({ 'x-publishable-key': 'biz_live_valid_key' });

    let thrownError: any;
    try {
      await guard.canActivate(context);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(DomainException);
    expect(thrownError.code).toBe('STOREFRONT_RATE_LIMIT_EXCEEDED');
    expect(thrownError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });
});
