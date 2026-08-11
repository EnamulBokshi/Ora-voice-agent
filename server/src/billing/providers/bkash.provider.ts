import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  ProviderSubscriptionRef,
  ChargeResult,
} from './payment-provider.interface';

@Injectable()
export class BkashProvider implements PaymentProvider {
  private readonly logger = new Logger(BkashProvider.name);

  async createSubscription(
    businessId: string,
    planId: string,
  ): Promise<ProviderSubscriptionRef> {
    this.logger.warn(
      `[BkashProvider] bKash payment provider is bypassed for now (businessId: ${businessId}, planId: ${planId}).`,
    );
    throw new Error(
      'bKash payment provider is temporarily disabled. Please select Stripe for subscription payments.',
    );
  }

  async cancelSubscription(ref: ProviderSubscriptionRef): Promise<void> {
    this.logger.warn(`[BkashProvider] cancelSubscription stub called for ref ${ref.subscriptionId}`);
  }

  async chargeRenewal(ref: ProviderSubscriptionRef): Promise<ChargeResult> {
    this.logger.warn(`[BkashProvider] chargeRenewal stub called for ref ${ref.subscriptionId}`);
    return {
      success: false,
      errorMessage: 'bKash provider is temporarily bypassed.',
    };
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): boolean {
    return true;
  }

  async handleWebhookEvent(payload: unknown): Promise<void> {
    this.logger.log(`[BkashProvider] handleWebhookEvent stub received payload.`);
  }
}
