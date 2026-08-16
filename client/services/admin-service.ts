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

