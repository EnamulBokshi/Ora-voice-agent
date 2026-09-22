export interface PlanLimits {
  voiceMinutes: number;
  documentLimit: number;
  websiteLimit: number;
  // Legacy optional fields for backward compatibility
  conversationMinutes?: number;
  ordersPerMonth?: number;
  connectedStores?: number;
  seats?: number;
}

export interface CustomPlanLimits {
  voiceMinutes?: number;
  documentLimit?: number;
  websiteLimit?: number;
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
  /** Free-trial length applied before the first charge. */
  trialDays?: number;
  isActive: boolean;
  activeSubscribers?: number;
}

export interface Subscription {
  _id: string;
  businessId: string;
  planId: string;
  billingProvider: 'stripe' | 'bkash' | 'shopify';
  providerRef?: string;
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialDays?: number;
  trialExpiresAt?: string;
  hasUsedTrial?: boolean;
  cancelAtPeriodEnd: boolean;
  customLimits?: CustomPlanLimits;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  voiceMinutes: number;
  documentCount: number;
  websiteCount: number;
  conversationMinutes?: number;
  ordersPerMonth?: number;
  connectedStores?: number;
  seats?: number;
}

export interface SubscriptionDetailsResponse {
  subscription: Subscription | null;
  plan: Plan | null;
  usage: SubscriptionUsage;
  hasUsedTrial?: boolean;
  isTrialing?: boolean;
  trialDaysRemaining?: number | null;
  trialHoursRemaining?: number | null;
  trialExpiresAt?: string;
}

export interface StartTrialPayload {
  websiteDomain: string;
  planId?: string;
}

export interface StartTrialResponse {
  trialDays: number;
  trialExpiresAt: string;
  message: string;
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


