import { apiClient } from '@/lib/api-client';
import {
  Plan,
  SubscriptionDetailsResponse,
  SubscribePayload,
  SubscribeResponseData,
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

export async function subscribePlanApi(
  payload: SubscribePayload,
): Promise<SubscribeResponseData> {
  const body = {
    planId: payload.planId,
    billingProvider: payload.billingProvider || payload.provider || 'stripe',
  };
  return apiClient<SubscribeResponseData>('/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
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
    body: JSON.stringify({ planId, returnUrl }),
  });
}

