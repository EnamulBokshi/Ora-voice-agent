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
  /** Saved as 'month'/'year' by the server; older admin saves used 'monthly'/'yearly'. */
  billingInterval: 'month' | 'year' | 'monthly' | 'yearly';
  description?: string;
  /** Admin-set highlight label, e.g. "Most popular". */
  badge?: string;
  sortOrder?: number;
  isCustom?: boolean;
  /** Percent off for paying yearly; the yearly price is derived from it. */
  yearlyDiscountPercent?: number;
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
  billingCycle?: 'month' | 'year';
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
  /** Code only. The server recomputes the discount from its own records. */
  couponCode?: string;
  /** Pay monthly or yearly (discounted yearly price, charged up front). */
  billingCycle?: 'month' | 'year';
}

export type CouponDiscountType = 'percent' | 'fixed';

/** Server-computed pricing for a coupon. Never assembled on the client. */
export interface CouponQuote {
  code: string;
  discountType: CouponDiscountType;
  currency: 'USD' | 'BDT';
  amountBeforeMinor: number;
  discountMinor: number;
  amountAfterMinor: number;
  /** Cycle these amounts are for. */
  billingCycle?: 'month' | 'year';
  coversFullPrice: boolean;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: CouponDiscountType;
  percentOff: number;
  amountOffUsdCents: number;
  amountOffBdtPaisa: number;
  appliesToPlanIds: string[];
  maxRedemptions: number | null;
  redeemedCount: number;
  maxRedemptionsPerBusiness: number;
  validFrom: string | null;
  expiresAt: string | null;
  isActive: boolean;
  notes: string;
  createdAt?: string;
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
  discount?: {
    code: string;
    currency: 'USD' | 'BDT';
    discountMinor: number;
    amountAfterMinor: number;
  } | null;
  coupon?: {
    code: string;
    discountMinor: number;
    currency: string;
  };
}


