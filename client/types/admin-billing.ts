export interface BillingOverviewStats {
  mrrUsd: number;
  arrUsd: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  suspendedSubscriptions: number;
  canceledSubscriptions: number;
  totalTrackedSubscriptions: number;
  renewalsDue7Days: number;
}

export interface CouponTelemetryStats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountVolumeUsd: number;
  totalDiscountVolumeBdt: number;
}

export interface AdminBillingStatsResponse {
  overview: BillingOverviewStats;
  providers: Record<string, number>;
  planDistribution: Record<string, number>;
  couponTelemetry: CouponTelemetryStats;
}

export interface AdminPlanItem {
  _id: string;
  planId: string;
  name: string;
  description?: string;
  priceUsdCents: number;
  priceBdtPaisa: number;
  billingInterval: string;
  /** Percent off for paying yearly; the yearly price is derived from it. */
  yearlyDiscountPercent?: number;
  limits: {
    conversationMinutes: number;
    ordersPerMonth: number;
    connectedStores: number;
    seats: number;
  };
  features: string[];
  trialDays: number;
  badge?: string;
  sortOrder: number;
  isActive: boolean;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminSubscriptionItem {
  id: string;
  businessId: string;
  business: {
    id: string;
    name: string;
    domain: string;
    status: string;
    connectedPlatform?: string;
    owner?: {
      email: string;
      name: string;
    } | null;
  } | null;
  planId: string;
  plan: {
    name: string;
    priceUsdCents: number;
    priceBdtPaisa: number;
    billingInterval: string;
    yearlyDiscountPercent?: number;
  } | null;
  billingProvider: 'stripe' | 'bkash' | 'shopify';
  providerRef?: string;
  status: 'active' | 'trialing' | 'past_due' | 'suspended' | 'canceled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  billingCycle?: 'month' | 'year';
  cancelAtPeriodEnd: boolean;
  appliedCoupon?: {
    couponId?: string;
    code: string;
    discountType: string;
    discountAmount: number;
    appliedAt: string;
  } | null;
  adminNotes?: string;
  usage?: {
    conversationMinutes: number;
    ordersPerMonth: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminSubscriptionsResponse {
  items: AdminSubscriptionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminCouponItem {
  _id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount';
  discountAmount: number;
  currency: 'USD' | 'BDT' | 'ALL';
  applicablePlans: string[];
  duration: 'once' | 'forever' | 'repeating';
  durationInMonths?: number;
  maxRedemptions?: number | null;
  redemptionsCount: number;
  maxRedemptionsPerTenant: number;
  minPlanPriceCents?: number;
  validFrom: string;
  validUntil?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCouponsResponse {
  items: AdminCouponItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminCouponRedemptionItem {
  id: string;
  couponCode: string;
  business: {
    id: string;
    name: string;
    domain: string;
    status: string;
  } | null;
  redeemedBy: {
    id: string;
    email: string;
    name: string;
  } | null;
  planId: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  redeemedAt: string;
}

export interface AdminCouponRedemptionsResponse {
  items: AdminCouponRedemptionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreatePlanPayload {
  planId: string;
  name: string;
  description?: string;
  priceUsdCents: number;
  priceBdtPaisa: number;
  billingInterval?: string;
  yearlyDiscountPercent?: number;
  limits: {
    conversationMinutes: number;
    ordersPerMonth: number;
    connectedStores: number;
    seats: number;
  };
  features: string[];
  trialDays?: number;
  badge?: string;
  sortOrder?: number;
  isActive?: boolean;
  isCustom?: boolean;
}

export interface CreateCouponPayload {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount';
  discountAmount: number;
  currency?: 'USD' | 'BDT' | 'ALL';
  applicablePlans?: string[];
  duration?: 'once' | 'forever' | 'repeating';
  durationInMonths?: number;
  maxRedemptions?: number | null;
  maxRedemptionsPerTenant?: number;
  minPlanPriceCents?: number;
  validFrom?: string;
  validUntil?: string | null;
  isActive?: boolean;
}

export interface UpdateSubscriptionAdminPayload {
  planId?: string;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  adminNotes?: string;
}
