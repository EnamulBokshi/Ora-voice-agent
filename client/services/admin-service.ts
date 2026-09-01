import { apiClient } from '@/lib/api-client';
import {
  PlatformStatsData,
  AdminBusinessesResponse,
  AdminBusinessDetail,
  AdminUsersResponse,
  AdminUserDetail,
  CreatePlatformUserPayload,
  UpdateAdminUserPayload,
  AdminUserActionPayload,
  VoiceSessionsResponse,
  SystemHealthData,
  PlatformAgentConfigData,
  UpdatePlatformAgentPayload,
  PlatformTokenAnalyticsResponse,
  MerchantCostItem,
} from '@/types/admin';

export async function fetchPlatformStats(period = '30d'): Promise<PlatformStatsData> {
  const query = period ? `?period=${encodeURIComponent(period)}` : '';
  return apiClient<PlatformStatsData>(`/admin/stats${query}`, {
    method: 'GET',
  });
}

export async function fetchAdminBusinesses(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<AdminBusinessesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);

  const queryStr = searchParams.toString();
  return apiClient<AdminBusinessesResponse>(
    `/admin/businesses${queryStr ? `?${queryStr}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function fetchAdminBusinessById(
  businessId: string,
): Promise<{ business: AdminBusinessDetail }> {
  return apiClient<{ business: AdminBusinessDetail }>(
    `/admin/businesses/${businessId}`,
    {
      method: 'GET',
    },
  );
}

export async function updateBusinessStatus(
  businessId: string,
  status: 'active' | 'suspended' | 'pending',
): Promise<{ id: string; name: string; status: string; message: string }> {
  return apiClient<{ id: string; name: string; status: string; message: string }>(
    `/admin/businesses/${businessId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}

export async function adminRevokeBusinessKeyApi(
  businessId: string,
): Promise<{ success: boolean; message: string; businessId: string; keyStatus: string }> {
  return apiClient<{ success: boolean; message: string; businessId: string; keyStatus: string }>(
    `/admin/businesses/${businessId}/publishable-key`,
    {
      method: 'DELETE',
    },
  );
}

export async function adminUpdateKeyStatusApi(
  businessId: string,
  keyStatus: 'active' | 'suspended',
): Promise<{ success: boolean; message: string; businessId: string; keyStatus: string }> {
  return apiClient<{ success: boolean; message: string; businessId: string; keyStatus: string }>(
    `/admin/businesses/${businessId}/key-status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ keyStatus }),
    },
  );
}

export async function fetchAdminUsers(params?: {
  page?: number;
  limit?: number;
  role?: string;
  plan?: string;
  status?: string;
  billingProvider?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<AdminUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.role) searchParams.set('role', params.role);
  if (params?.plan) searchParams.set('plan', params.plan);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.billingProvider) searchParams.set('billingProvider', params.billingProvider);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const queryStr = searchParams.toString();
  return apiClient<AdminUsersResponse>(
    `/admin/users${queryStr ? `?${queryStr}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function fetchAdminUserById(
  userId: string,
): Promise<{ user: AdminUserDetail }> {
  return apiClient<{ user: AdminUserDetail }>(`/admin/users/${userId}`, {
    method: 'GET',
  });
}

export async function createPlatformUser(
  payload: CreatePlatformUserPayload,
): Promise<{ id: string; name: string; email: string; role: string; emailVerified: boolean; message: string }> {
  return apiClient<{ id: string; name: string; email: string; role: string; emailVerified: boolean; message: string }>(
    `/admin/users`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export async function updateAdminUser(
  userId: string,
  payload: UpdateAdminUserPayload,
): Promise<{ id: string; name: string; email: string; role: string; emailVerified: boolean; message: string }> {
  return apiClient<{ id: string; name: string; email: string; role: string; emailVerified: boolean; message: string }>(
    `/admin/users/${userId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function executeAdminUserAction(
  userId: string,
  action: AdminUserActionPayload['action'],
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/admin/users/${userId}/action`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function fetchVoiceSessions(limit = 20): Promise<VoiceSessionsResponse> {
  return apiClient<VoiceSessionsResponse>(`/admin/voice-sessions?limit=${limit}`, {
    method: 'GET',
  });
}

export async function fetchSystemHealth(): Promise<SystemHealthData> {
  return apiClient<SystemHealthData>('/admin/system/health', {
    method: 'GET',
  });
}

export async function fetchPlatformAgentConfig(): Promise<PlatformAgentConfigData> {
  return apiClient<PlatformAgentConfigData>('/admin/platform-agent', {
    method: 'GET',
  });
}

export async function updatePlatformAgentConfig(
  payload: UpdatePlatformAgentPayload,
): Promise<{ success: boolean; business: any; agentConfig: any }> {
  return apiClient<{ success: boolean; business: any; agentConfig: any }>('/admin/platform-agent', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchTokenCostAnalytics(days = 30): Promise<PlatformTokenAnalyticsResponse> {
  return apiClient<PlatformTokenAnalyticsResponse>(`/admin/token-analytics?days=${days}`, {
    method: 'GET',
  });
}

export async function fetchMerchantsCost(): Promise<MerchantCostItem[]> {
  return apiClient<MerchantCostItem[]>('/admin/merchants-cost', {
    method: 'GET',
  });
}

export async function updateMerchantBudgetCap(
  businessId: string,
  budgetCapUsd: number | null,
): Promise<{ businessId: string; monthlyAiBudgetUsd: number | null; success: boolean }> {
  return apiClient<{ businessId: string; monthlyAiBudgetUsd: number | null; success: boolean }>(
    `/admin/businesses/${businessId}/budget-cap`,
    {
      method: 'PATCH',
      body: JSON.stringify({ budgetCapUsd }),
    },
  );
}


