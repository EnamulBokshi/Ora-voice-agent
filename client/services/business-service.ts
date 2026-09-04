import { apiClient } from '@/lib/api-client';
import { Business } from '@/types/auth';

export interface UpdateBusinessInput {
  name?: string;
  domain?: string;
  shopifyStoreUrl?: string;
  woocommerceStoreUrl?: string;
  currency?: string;
  timezone?: string;
  supportEmail?: string;
  isWidgetActive?: boolean;
}

export async function getCurrentBusinessApi(accessToken?: string): Promise<Business | null> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<Business | null>('/business/current', {
    method: 'GET',
    headers,
  });
}

export async function updateBusinessApi(
  data: UpdateBusinessInput,
  accessToken?: string,
): Promise<{ message: string; business: Business }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<{ message: string; business: Business }>('/business/current', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
}

export async function toggleWidgetStatusApi(
  isWidgetActive: boolean,
  accessToken?: string,
): Promise<{ message: string; business: Business }> {
  return updateBusinessApi({ isWidgetActive }, accessToken);
}

export async function deletePublishableKeyApi(accessToken?: string): Promise<{
  message: string;
  business: Business;
}> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<{ message: string; business: Business }>('/business/publishable-key', {
    method: 'DELETE',
    headers,
  });
}

export async function generatePublishableKeyApi(accessToken?: string): Promise<{
  message: string;
  publishableKey: string;
  business: Business;
}> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<{ message: string; publishableKey: string; business: Business }>(
    '/business/publishable-key',
    {
      method: 'POST',
      headers,
    },
  );
}
