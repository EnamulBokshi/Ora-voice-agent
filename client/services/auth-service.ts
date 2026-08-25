import { apiClient } from '@/lib/api-client';
import {
  AuthResponseData,
  ProfileResponseData,
  OtpResponseData,
  RefreshResponseData,
  ForgotPasswordResponseData,
  VerifyResetTokenResponseData,
  ResetPasswordResponseData,
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
  clearProfileCache();
  return apiClient<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

let profileCache: { data: ProfileResponseData; timestamp: number } | null = null;
let profileInFlightPromise: Promise<ProfileResponseData> | null = null;

export function clearProfileCache() {
  profileCache = null;
  profileInFlightPromise = null;
}

export async function getMeApi(accessToken?: string, forceRefresh = false): Promise<ProfileResponseData> {
  const now = Date.now();
  if (!forceRefresh && profileCache && (now - profileCache.timestamp) < 5000) {
    return profileCache.data;
  }

  if (profileInFlightPromise) {
    return profileInFlightPromise;
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  profileInFlightPromise = apiClient<ProfileResponseData>('/auth/me', {
    method: 'GET',
    headers,
  })
    .then((data) => {
      profileCache = { data, timestamp: Date.now() };
      return data;
    })
    .finally(() => {
      profileInFlightPromise = null;
    });

  return profileInFlightPromise;
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
  payload: { code: string; email?: string } | string,
  accessToken?: string,
): Promise<OtpResponseData & { accessToken?: string; user?: User }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const body = typeof payload === 'string' ? { code: payload } : payload;

  return apiClient<OtpResponseData & { accessToken?: string; user?: User }>('/auth/verify-otp', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
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

export async function forgotPasswordApi(payload: {
  email: string;
}): Promise<ForgotPasswordResponseData> {
  return apiClient<ForgotPasswordResponseData>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyResetTokenApi(
  token: string,
): Promise<VerifyResetTokenResponseData> {
  return apiClient<VerifyResetTokenResponseData>(
    `/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
    {
      method: 'GET',
    },
  );
}

export async function resetPasswordApi(payload: {
  token: string;
  password: string;
}): Promise<ResetPasswordResponseData> {
  return apiClient<ResetPasswordResponseData>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

