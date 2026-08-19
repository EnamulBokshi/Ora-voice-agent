import { apiClient } from '@/lib/api-client';
import {
  AuthResponseData,
  ProfileResponseData,
  OtpResponseData,
  RefreshResponseData,
  User,
} from '@/types/auth';

export async function registerApi(payload: {
  businessName: string;
  name: string;
  email: string;
  password: string;
  domain?: string;
}): Promise<AuthResponseData> {
  return apiClient<AuthResponseData>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginApi(payload: {
  email: string;
  password: string;
}): Promise<AuthResponseData> {
  return apiClient<AuthResponseData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshApi(): Promise<RefreshResponseData> {
  return apiClient<RefreshResponseData>('/auth/refresh', {
    method: 'POST',
  });
}

export async function logoutApi(): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export async function getMeApi(accessToken?: string): Promise<ProfileResponseData> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<ProfileResponseData>('/auth/me', {
    method: 'GET',
    headers,
  });
}

export async function updateProfileApi(
  data: { name?: string; phone?: string },
  accessToken?: string,
): Promise<{ message: string; user: User }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<{ message: string; user: User }>('/users/profile', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
}

export async function changePasswordApi(
  payload: { currentPassword: string; newPassword: string },
  accessToken?: string,
): Promise<{ message: string }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<{ message: string }>('/users/change-password', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

export async function verifyOtpApi(
  code: string,
  accessToken?: string,
): Promise<OtpResponseData> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<OtpResponseData>('/auth/verify-otp', {
    method: 'POST',
    headers,
    body: JSON.stringify({ code }),
  });
}

export async function resendOtpApi(
  accessToken?: string,
): Promise<OtpResponseData> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<OtpResponseData>('/auth/resend-otp', {
    method: 'POST',
    headers,
  });
}

export async function resendOnboardingApi(
  accessToken?: string,
): Promise<{ success: boolean; message: string }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return apiClient<{ success: boolean; message: string }>('/auth/resend-onboarding', {
    method: 'POST',
    headers,
  });
}
