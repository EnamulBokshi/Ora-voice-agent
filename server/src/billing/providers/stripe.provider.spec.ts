import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';

import { StripeProvider } from './stripe.provider';
import { Plan } from '../schemas/plan.schema';
import { DomainException } from '../../common/exceptions/domain.exception';

/**
 * Price used to be inline: `planId === 'scale' ? 19900 : 4900`. Every other
 * tier was billed $49 whatever the plan document said, and a price change in
 * the database reached the Shopify and bKash paths but not this one.
 *
 * No STRIPE_SECRET_KEY is configured here, so the provider runs in its mock
 * mode and never reaches Stripe. The plan lookup happens before that branch,
 * which is the part under test.
 */
describe('StripeProvider — plan pricing', () => {
  const BUSINESS_ID = '671234567890123456789012';

  let provider: StripeProvider;
  let planModel: { findOne: jest.Mock };

  const mockPlan = (plan: any) => {
    planModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(plan),
    });
  };

  beforeEach(async () => {
    planModel = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeProvider,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
        { provide: getModelToken(Plan.name), useValue: planModel },
      ],
    }).compile();

    provider = module.get<StripeProvider>(StripeProvider);
  });

  it('reads the price from the plan document', async () => {
    mockPlan({
      planId: 'growth',
      name: 'Growth Plan',
      priceUsdCents: 4900,
      billingInterval: 'month',
    });

    // With no Stripe key configured the provider refuses rather than minting a
    // fake subscription id, but it still prices from the plan document first.
    await expect(
      provider.createSubscription(BUSINESS_ID, 'growth'),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_UNAVAILABLE' });

    expect(planModel.findOne).toHaveBeenCalledWith({ planId: 'growth' });
  });

  it('never returns a usable reference when Stripe is not configured', async () => {
    mockPlan({
      planId: 'growth',
      name: 'Growth Plan',
      priceUsdCents: 4900,
      billingInterval: 'month',
    });

    await expect(
      provider.createSubscription(BUSINESS_ID, 'growth'),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_UNAVAILABLE' });
  });

  it('refuses a plan that does not exist', async () => {
    // 'starter' was offered by the Shopify plan picker and exists in no
    // catalogue; the old code would have silently charged $49 for it.
    mockPlan(null);

    await expect(
      provider.createSubscription(BUSINESS_ID, 'starter'),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('refuses a plan with no price rather than opening a $0.00 checkout', async () => {
    mockPlan({
      planId: 'free',
      name: 'Free Tier',
      priceUsdCents: 0,
      billingInterval: 'month',
    });

    await expect(
      provider.createSubscription(BUSINESS_ID, 'free'),
    ).rejects.toMatchObject({ response: { code: 'PLAN_NOT_PAYABLE' } });
  });
});
