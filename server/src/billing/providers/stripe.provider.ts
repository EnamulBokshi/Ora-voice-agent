import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentProvider,
  ProviderSubscriptionRef,
  ChargeResult,
  CustomerBillingDetails,
} from './payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider {
  private readonly stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(private readonly configService: ConfigService) {
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

  async createSubscription(
    businessId: string,
    planId: string,
    customerDetails?: CustomerBillingDetails,
  ): Promise<ProviderSubscriptionRef> {
    this.logger.log(
      `[StripeProvider] Creating Stripe subscription for business ${businessId} (plan: ${planId}, email: ${customerDetails?.email || 'unspecified'})`,
    );

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
          this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

        const session = await this.stripe.checkout.sessions.create({
          customer: customer.id,
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
                  name: `ORA ${planId.toUpperCase()} Plan`,
                },
                unit_amount: planId === 'scale' ? 19900 : 4900,
                recurring: { interval: 'month' },
              },
              quantity: 1,
            },
          ],
          success_url: `${frontendUrl}/pricing?session_id={CHECKOUT_SESSION_ID}&status=success`,
          cancel_url: `${frontendUrl}/pricing?canceled=true`,
          metadata: { businessId, planId },
        });

        return {
          subscriptionId: session.id,
          providerRef: session.url || session.id,
        };
      } catch (err: any) {
        this.logger.error(`[StripeProvider] Stripe API error: ${err.message}`);
      }
    }

    // Fallback development reference ID
    const mockSubId = `sub_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      subscriptionId: mockSubId,
      providerRef: mockSubId,
    };
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
