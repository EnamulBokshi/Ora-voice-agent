import { apiClient } from '@/lib/api-client';
import {
  Plan,
  SubscriptionDetailsResponse,
  SubscribePayload,
  SubscribeResponseData,
  CouponQuote,
} from '@/types/billing';

export async function getBillingPlansApi(): Promise<Plan[]> {
  return apiClient<Plan[]>('/billing/plans', {
    method: 'GET',
  });
}

export async function getSubscriptionApi(): Promise<SubscriptionDetailsResponse> {
  return apiClient<SubscriptionDetailsResponse>('/billing/subscription', {
    method: 'GET',
  });
}

export async function startTrialApi(payload: {
  websiteDomain: string;
  planId?: string;
}): Promise<{
  trialDays: number;
  trialExpiresAt: string;
  message: string;
}> {
  return apiClient<{
    trialDays: number;
    trialExpiresAt: string;
    message: string;
  }>('/billing/start-trial', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function subscribePlanApi(
  payload: SubscribePayload,
): Promise<SubscribeResponseData> {
  const body: Record<string, any> = {
    planId: payload.planId,
    billingProvider: payload.billingProvider || payload.provider || 'stripe',
    ...(payload.couponCode ? { couponCode: payload.couponCode } : {}),
    billingCycle: payload.billingCycle || 'month',
  };
  if (payload.couponCode) {
    body.couponCode = payload.couponCode;
  }
  return apiClient<SubscribeResponseData>('/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getBillingHistoryApi(
  page = 1,
  limit = 15,
): Promise<{
  subscription: any;
  transactions: any[];
  invoices: any;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  return apiClient(`/billing/history?page=${page}&limit=${limit}`, {
    method: 'GET',
  });
}

export async function cancelSubscriptionApi(): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/billing/cancel', {
    method: 'POST',
  });
}

export async function executeBkashAgreementApi(payload: {
  paymentID: string;
  planId?: string;
  billingCycle?: 'month' | 'year';
}): Promise<{
  success: boolean;
  agreementID: string;
  subscription: any;
  transaction: any;
  invoice: any;
}> {
  return apiClient<{
    success: boolean;
    agreementID: string;
    subscription: any;
    transaction: any;
    invoice: any;
  }>('/billing/bkash/execute-agreement', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function subscribeShopifyBillingApi(
  planId: string,
  returnUrl?: string,
  billingCycle: 'month' | 'year' = 'month',
): Promise<{
  subscriptionId: string;
  confirmationUrl: string;
  message: string;
}> {
  return apiClient<{
    subscriptionId: string;
    confirmationUrl: string;
    message: string;
  }>('/shopify/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify({ planId, returnUrl, billingCycle }),
  });
}


export interface PaymentMethodOption {
  provider: 'stripe' | 'bkash';
  label: string;
  currency: 'USD' | 'BDT';
  available: boolean;
}

export async function getPaymentMethodsApi(): Promise<PaymentMethodOption[]> {
  return apiClient<PaymentMethodOption[]>('/billing/payment-methods', {
    method: 'GET',
  });
}

/** Prices a coupon for the signed-in tenant. The amounts come from the server. */
export async function validateCouponApi(payload: {
  code: string;
  planId: string;
  billingProvider?: 'stripe' | 'bkash';
  billingCycle?: 'month' | 'year';
}): Promise<CouponQuote> {
  return apiClient<CouponQuote>('/billing/coupons/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
