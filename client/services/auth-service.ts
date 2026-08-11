import { apiClient } from '@/lib/api-client';
import {
  AuthResponseData,
  ProfileResponseData,
  OtpResponseData,
  RefreshResponseData,
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
