import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import {
  PaymentProvider,
  ProviderSubscriptionRef,
  ChargeResult,
  CustomerBillingDetails,
} from './payment-provider.interface';
import { Plan, PlanDocument } from '../schemas/plan.schema';
import { DomainException } from '../../common/exceptions/domain.exception';

@Injectable()
export class StripeProvider implements PaymentProvider {
  private readonly stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (secretKey && !secretKey.includes('replace_with')) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-01-27.acacia' as any,
      });
      this.logger.log('[StripeProvider] Stripe SDK initialized with secret key.');
    } else {
      this.logger.warn(
        '[StripeProvider] STRIPE_SECRET_KEY is not set or using placeholder. Running in mock/development mode.',
      );
    }
  }

  /** True only when a real (non-placeholder) STRIPE_SECRET_KEY is configured. */
  get isConfigured(): boolean {
    return this.stripe !== null;
  }

  async createSubscription(
    businessId: string,
    planId: string,
    customerDetails?: CustomerBillingDetails,
    /**
     * A first-payment discount, already validated and priced by CouponService.
     * It is turned into a Stripe coupon with `duration: 'once'`, so the checkout
     * total drops but renewals still bill the full plan price.
     */
    discount?: { percentOff?: number; amountOffUsdCents?: number; code?: string },
  ): Promise<ProviderSubscriptionRef> {
    this.logger.log(
      `[StripeProvider] Creating Stripe subscription for business ${businessId} (plan: ${planId}, email: ${customerDetails?.email || 'unspecified'})`,
    );

    // The plan document is the price. This used to be
    // `planId === 'scale' ? 19900 : 4900` inline, which billed every other
    // tier $49 whatever the catalogue said and silently ignored any price
    // change made in the database.
    const plan = await this.planModel.findOne({ planId } as any).exec();
    if (!plan) {
      throw new DomainException(
        'PLAN_NOT_FOUND',
        `Plan ${planId} was not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!plan.priceUsdCents || plan.priceUsdCents <= 0) {
      // A zero-price plan is activated directly by BillingService and never
      // reaches a provider. Arriving here means a caller skipped that branch,
      // and a Stripe checkout for $0.00 is not the thing to fall back to.
      throw new DomainException(
        'PLAN_NOT_PAYABLE',
        `Plan ${planId} has no price to charge.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (this.stripe) {
      try {
        let customer: Stripe.Customer | undefined;

        // 1. Search for existing Stripe customer by email if provided
        if (customerDetails?.email) {
          const existing = await this.stripe.customers.list({
            email: customerDetails.email,
            limit: 1,
          });
          if (existing.data && existing.data.length > 0) {
            customer = existing.data[0];
          }
        }

        // 2. Create customer with email, name, and business metadata if not found
        if (!customer) {
          customer = await this.stripe.customers.create({
            email: customerDetails?.email,
            name: customerDetails?.name,
            metadata: { businessId },
          });
        }

        const frontendUrl =
          this.configService.get<string>('FRONTEND_URL') ||
          (this.configService.get<string>('NODE_ENV') === 'production'
            ? 'https://tryora.live'
            : 'http://localhost:3000');

        // Translate our coupon into a one-off Stripe coupon. Doing it here, from the
        // server-computed discount, keeps the checkout total and our own records in
        // agreement without ever trusting a client-side amount.
        let stripeDiscounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
        if (discount && (discount.percentOff || discount.amountOffUsdCents)) {
          try {
            const stripeCoupon = await this.stripe.coupons.create({
              duration: 'once',
              name: discount.code ? `ORA ${discount.code}` : 'ORA discount',
              ...(discount.percentOff
                ? { percent_off: discount.percentOff }
                : { amount_off: discount.amountOffUsdCents, currency: 'usd' }),
            });
            stripeDiscounts = [{ coupon: stripeCoupon.id }];
          } catch (err: any) {
            this.logger.error(
              `[StripeProvider] Could not create the discount for ${discount.code || 'coupon'}: ${err.message}`,
            );
            throw new DomainException(
              'COUPON_GATEWAY_ERROR',
              'The discount could not be applied at checkout. No charge was made.',
              HttpStatus.BAD_GATEWAY,
            );
          }
        }

        const session = await this.stripe.checkout.sessions.create({
          customer: customer.id,
          ...(stripeDiscounts ? { discounts: stripeDiscounts } : {}),
          customer_update: {
            name: 'auto',
            address: 'auto',
          },
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: plan.name,
                },
                unit_amount: plan.priceUsdCents,
                recurring: {
                  interval:
                    plan.billingInterval === 'year' ? 'year' : 'month',
                },
              },
              quantity: 1,
            },
          ],
          success_url: `${frontendUrl}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
          cancel_url: `${frontendUrl}/pricing?canceled=true`,
          metadata: {
            businessId,
            planId,
            ...(discount?.code ? { couponCode: discount.code } : {}),
          },
        });

        return {
          subscriptionId: session.id,
          providerRef: session.url || session.id,
        };
      } catch (err: any) {
        if (err instanceof DomainException) throw err;
        this.logger.error(`[StripeProvider] Stripe API error: ${err.message}`);
      }
    }

    // No SDK means no checkout. This used to mint a `sub_stripe_<timestamp>` id that
    // BillingService then treated as a completed purchase, which is how paid plans
    // were activated without a charge.
    throw new DomainException(
      'PAYMENT_PROVIDER_UNAVAILABLE',
      'Card payments are not available right now. Choose another payment method or contact support.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  async cancelSubscription(ref: ProviderSubscriptionRef): Promise<void> {
    const subId = ref.providerRef || ref.subscriptionId;
    this.logger.log(`[StripeProvider] Canceling Stripe subscription ${subId}`);

    if (this.stripe && subId && subId.startsWith('sub_')) {
      try {
        await this.stripe.subscriptions.update(subId, {
          cancel_at_period_end: true,
        });
      } catch (err: any) {
        this.logger.error(`[StripeProvider] Cancel error: ${err.message}`);
      }
    }
  }

  async chargeRenewal(ref: ProviderSubscriptionRef): Promise<ChargeResult> {
    // Stripe natively auto-charges recurring subscriptions via invoices
    this.logger.log(
      `[StripeProvider] chargeRenewal (Stripe native recurring auto-charge) for sub ${ref.providerRef}`,
    );
    return {
      success: true,
      transactionId: `txn_stripe_auto_${Date.now()}`,
      amount: 4900,
      currency: 'USD',
    };
  }

  constructWebhookEvent(
    rawBody: Buffer | string | any,
    headers: Record<string, string>,
    fallbackBody?: any,
  ): Stripe.Event | null {
    const signature = headers['stripe-signature'];
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!this.stripe) {
      this.logger.warn('[StripeProvider] Stripe SDK is not initialized, using fallback body.');
      return fallbackBody || (typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody);
    }

    if (!webhookSecret || webhookSecret.includes('replace_with') || !signature) {
      return fallbackBody || (Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString('utf8')) : rawBody);
    }

    try {
      const payload = Buffer.isBuffer(rawBody)
        ? rawBody
        : typeof rawBody === 'string'
        ? rawBody
        : Buffer.from(JSON.stringify(rawBody));
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`[StripeProvider] Webhook signature verification failed: ${err.message}`);
      return null;
    }
  }

  verifyWebhookSignature(
    rawBody: Buffer | string | any,
    headers: Record<string, string>,
  ): boolean {
    return this.constructWebhookEvent(rawBody, headers) !== null;
  }

  async handleWebhookEvent(payload: any): Promise<void> {
    const eventType = payload?.type;
    this.logger.log(`[StripeProvider] Handled webhook event: ${eventType}`);
  }
}
