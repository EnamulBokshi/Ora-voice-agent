import { apiClient } from '@/lib/api-client';
import {
  PlatformStatsData,
  AdminBusinessesResponse,
  AdminUsersResponse,
  VoiceSessionsResponse,
  SystemHealthData,
} from '@/types/admin';

export async function fetchPlatformStats(): Promise<PlatformStatsData> {
  return apiClient<PlatformStatsData>('/admin/stats', {
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
  search?: string;
}): Promise<AdminUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.role) searchParams.set('role', params.role);
  if (params?.search) searchParams.set('search', params.search);

  const queryStr = searchParams.toString();
  return apiClient<AdminUsersResponse>(
    `/admin/users${queryStr ? `?${queryStr}` : ''}`,
    {
      method: 'GET',
    },
  );
}

export async function fetchVoiceSessions(): Promise<VoiceSessionsResponse> {
  return apiClient<VoiceSessionsResponse>('/admin/voice-sessions', {
    method: 'GET',
  });
}

export async function fetchSystemHealth(): Promise<SystemHealthData> {
  return apiClient<SystemHealthData>('/admin/system/health', {
    method: 'GET',
  });
}
