import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AiToolsExecutor } from './ai-tools.executor';
import { ProductsService } from '../../products/products.service';
import { RagService } from '../../rag/services/rag.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { RedisService } from '../../common/redis/redis.service';
import { EventsService } from '../../events/events.service';
import { OrdersService } from '../../orders/orders.service';
import { AgentConfigService } from '../../agent-config/agent-config.service';
import { BillingService } from '../../billing/billing.service';
import { CouponService } from '../../billing/services/coupon.service';
import { Business } from '../../users/schemas/business.schema';
import { DomainException } from '../../common/exceptions/domain.exception';
import { HttpStatus } from '@nestjs/common';

/**
 * apply_coupon carries a code the visitor already has to the checkout form. It must
 * never price a discount itself, and never claim one it could not verify.
 */
describe('AiToolsExecutor: apply_coupon', () => {
  let executor: AiToolsExecutor;
  let couponService: any;
  let redisStore: Record<string, string>;

  const growthPlan = {
    planId: 'growth',
    name: 'Growth',
    priceUsdCents: 4900,
    priceBdtPaisa: 590000,
  };

  const buildModule = async (publishableKey: string): Promise<TestingModule> => {
    redisStore = {};

    couponService = {
      previewPublic: jest.fn(),
      quote: jest.fn(),
    };

    return Test.createTestingModule({
      providers: [
        AiToolsExecutor,
        { provide: ProductsService, useValue: {} },
        { provide: RagService, useValue: {} },
        { provide: KnowledgeService, useValue: {} },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              get: jest.fn((key: string) => Promise.resolve(redisStore[key] ?? null)),
              set: jest.fn((key: string, value: string) => {
                redisStore[key] = value;
                return Promise.resolve('OK');
              }),
              del: jest.fn().mockResolvedValue(1),
            }),
          },
        },
        { provide: EventsService, useValue: { logEvent: jest.fn().mockResolvedValue({}) } },
        { provide: OrdersService, useValue: {} },
        { provide: AgentConfigService, useValue: {} },
        {
          provide: BillingService,
          useValue: { getPlans: jest.fn().mockResolvedValue([growthPlan]) },
        },
        { provide: CouponService, useValue: couponService },
        {
          provide: getModelToken(Business.name),
          useValue: {
            findById: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                lean: jest.fn().mockReturnValue({
                  exec: jest.fn().mockResolvedValue({ publishableKey }),
                }),
              }),
            }),
          },
        },
      ],
    }).compile();
  };

  const platformModule = () => buildModule('biz_live_ora_platform_system');

  beforeEach(async () => {
    const module = await platformModule();
    executor = module.get<AiToolsExecutor>(AiToolsExecutor);
  });

  it('prices a valid code from the server and returns the fill action', async () => {
    couponService.previewPublic.mockResolvedValue({ code: 'LAUNCH20' });
    couponService.quote.mockReturnValue({
      code: 'LAUNCH20',
      discountType: 'percent',
      currency: 'USD',
      amountBeforeMinor: 4900,
      discountMinor: 980,
      amountAfterMinor: 3920,
      coversFullPrice: false,
    });

    const res = await executor.executeTool('biz_1', 'sess_1', 'apply_coupon', {
      couponCode: 'launch20',
      planId: 'growth',
    });

    expect(res.success).toBe(true);
    expect(res.couponCode).toBe('LAUNCH20');
    expect(res.discountUsd).toBe(9.8);
    expect(res.amountDueUsd).toBe(39.2);
    expect(res.action).toEqual({
      type: 'apply_coupon',
      couponCode: 'LAUNCH20',
      planId: 'growth',
    });
  });

  it('strips spoken punctuation and casing before the lookup', async () => {
    couponService.previewPublic.mockResolvedValue({ code: 'SAVE10' });
    couponService.quote.mockReturnValue({
      code: 'SAVE10',
      discountType: 'fixed',
      currency: 'USD',
      amountBeforeMinor: 4900,
      discountMinor: 1000,
      amountAfterMinor: 3900,
      coversFullPrice: false,
    });

    await executor.executeTool('biz_1', 'sess_1', 'apply_coupon', {
      couponCode: ' save 10! ',
      planId: 'growth',
    });

    expect(couponService.previewPublic).toHaveBeenCalledWith('SAVE10', 'growth');
  });

  it('refuses a code the server rejected and tells the model not to claim a discount', async () => {
    couponService.previewPublic.mockRejectedValue(
      new DomainException('COUPON_EXPIRED', 'That coupon has expired.', HttpStatus.BAD_REQUEST),
    );

    const res = await executor.executeTool('biz_1', 'sess_1', 'apply_coupon', {
      couponCode: 'OLDCODE',
      planId: 'growth',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('COUPON_EXPIRED');
    expect(res.action).toBeUndefined();
    expect(res.message).toContain('Do not say a discount was applied');
  });

  it('stops a session that keeps guessing codes', async () => {
    redisStore['coupon:attempts:sess_1'] = '5';

    const res = await executor.executeTool('biz_1', 'sess_1', 'apply_coupon', {
      couponCode: 'GUESS1',
      planId: 'growth',
    });

    expect(res.error).toBe('COUPON_ATTEMPTS_EXCEEDED');
    expect(couponService.previewPublic).not.toHaveBeenCalled();
  });

  it('counts only failures against the guess budget', async () => {
    couponService.previewPublic.mockRejectedValue(
      new DomainException('COUPON_INVALID', 'Not valid.', HttpStatus.BAD_REQUEST),
    );

    await executor.executeTool('biz_1', 'sess_1', 'apply_coupon', { couponCode: 'NOPE' });

    expect(redisStore['coupon:attempts:sess_1']).toBe('1');
  });

  it('refuses a plan that does not exist rather than guessing one', async () => {
    couponService.previewPublic.mockResolvedValue({ code: 'LAUNCH20' });

    const res = await executor.executeTool('biz_1', 'sess_1', 'apply_coupon', {
      couponCode: 'LAUNCH20',
      planId: 'enterprise',
    });

    expect(res.success).toBe(false);
    expect(couponService.quote).not.toHaveBeenCalled();
  });

  it('is not available to a merchant storefront tenant', async () => {
    const module = await buildModule('biz_live_merchant_store');
    const merchantExecutor = module.get<AiToolsExecutor>(AiToolsExecutor);

    const res = await merchantExecutor.executeTool('biz_2', 'sess_2', 'apply_coupon', {
      couponCode: 'LAUNCH20',
    });

    expect(res.success).toBe(false);
    expect(couponService.previewPublic).not.toHaveBeenCalled();
  });
});
