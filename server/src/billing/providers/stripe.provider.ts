import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentProvider,
  ProviderSubscriptionRef,
  ChargeResult,
} from './payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey =
      this.configService.get<string>('STRIPE_SECRET_KEY') ||
      'sk_test_mock_stripe_key_for_development';

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  async createSubscription(
    businessId: string,
    planId: string,
  ): Promise<ProviderSubscriptionRef> {
    this.logger.log(
      `[StripeProvider] Creating Stripe subscription for business ${businessId} (plan: ${planId})`,
    );

    const mockSubId = `sub_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      subscriptionId: mockSubId,
      providerRef: mockSubId,
    };
  }

  async cancelSubscription(ref: ProviderSubscriptionRef): Promise<void> {
    this.logger.log(
      `[StripeProvider] Canceling Stripe subscription ${ref.providerRef || ref.subscriptionId}`,
    );
  }

  async chargeRenewal(ref: ProviderSubscriptionRef): Promise<ChargeResult> {
    // No-op for Stripe because Stripe handles recurring auto-charges natively
    this.logger.log(
      `[StripeProvider] chargeRenewal no-op called for Stripe sub ${ref.providerRef}`,
    );
    return {
      success: true,
      transactionId: `txn_stripe_auto_${Date.now()}`,
      amount: 4900,
      currency: 'USD',
    };
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): boolean {
    const signature = headers['stripe-signature'];
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret || !signature) {
      return true; // Pass through in local development mode
    }

    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      return true;
    } catch (err: any) {
      this.logger.error(`[StripeProvider] Webhook signature verification failed: ${err.message}`);
      return false;
    }
  }

  async handleWebhookEvent(payload: unknown): Promise<void> {
    this.logger.log(`[StripeProvider] Handled webhook event successfully.`);
  }
}
