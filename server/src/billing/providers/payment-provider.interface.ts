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

export interface CustomerBillingDetails {
  email?: string;
  name?: string;
}

export interface PaymentProvider {
  createSubscription(
    businessId: string,
    planId: string,
    customerDetails?: CustomerBillingDetails,
  ): Promise<ProviderSubscriptionRef>;
  cancelSubscription(ref: ProviderSubscriptionRef): Promise<void>;
  /** `amountMajor` is the renewal price in major units, for gateways that charge it themselves. */
  chargeRenewal(ref: ProviderSubscriptionRef, amountMajor?: number): Promise<ChargeResult>;
  verifyWebhookSignature(
    rawBody: Buffer,
    headers: Record<string, string>,
  ): boolean;
  handleWebhookEvent(payload: unknown): Promise<void>;
}
