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
  return apiClient<SubscribeResponseData>('/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelSubscriptionApi(): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/billing/cancel', {
    method: 'POST',
  });
}
