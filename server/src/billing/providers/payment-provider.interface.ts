export interface ProviderSubscriptionRef {
  subscriptionId: string;
  providerRef?: string;
}

export interface ChargeResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  currency?: string;
  errorMessage?: string;
}

export interface PaymentProvider {
  createSubscription(
    businessId: string,
    planId: string,
  ): Promise<ProviderSubscriptionRef>;
  cancelSubscription(ref: ProviderSubscriptionRef): Promise<void>;
  chargeRenewal(ref: ProviderSubscriptionRef): Promise<ChargeResult>;
  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): boolean;
  handleWebhookEvent(payload: unknown): Promise<void>;
}
