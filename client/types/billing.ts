export interface PlanLimits {
  conversationMinutes: number;
  ordersPerMonth: number;
  connectedStores: number;
  seats: number;
}

export interface Plan {
  _id: string;
  planId: string;
  name: string;
  priceUsdCents: number;
  priceBdtPaisa: number;
  billingInterval: 'monthly' | 'yearly';
  limits: PlanLimits;
  features: string[];
  isActive: boolean;
}

export interface Subscription {
  _id: string;
  businessId: string;
  planId: string;
  billingProvider: 'stripe' | 'bkash';
  providerRef?: string;
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  conversationMinutes: number;
  ordersPerMonth: number;
  connectedStores?: number;
  seats?: number;
}

export interface SubscriptionDetailsResponse {
  subscription: Subscription | null;
  plan: Plan | null;
  usage: SubscriptionUsage;
}

export interface SubscribePayload {
  planId: string;
  provider?: 'stripe' | 'bkash';
  billingProvider?: 'stripe' | 'bkash';
  paymentMethodId?: string;
}

export interface SubscribeResponseData {
  subscription?: Subscription;
  requiresRedirect?: boolean;
  billingProvider?: 'stripe' | 'bkash' | string;
  checkoutUrl?: string;
  bkashURL?: string;
  paymentID?: string;
  clientSecret?: string;
  message?: string;
  transaction?: any;
  invoice?: any;
}

