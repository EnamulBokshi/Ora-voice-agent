import { ApiResponse, ApiError } from '@/types/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public correlationId?: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  // Automatically attach Bearer access token from localStorage if available and not set
  if (typeof window !== 'undefined' && !headers['Authorization']) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Ensure httpOnly cookies are attached
  };

  try {
    const res = await fetch(url, config);
    const contentType = res.headers.get('content-type');

    let json: ApiResponse<T>;
    if (contentType && contentType.includes('application/json')) {
      json = await res.json();
    } else {
      const text = await res.text();
      throw new ApiClientError(
        'HTTP_ERROR',
        text || `HTTP request failed with status ${res.status}`,
        undefined,
        res.status,
      );
    }

    const isUnauthorized =
      res.status === 401 ||
      (json.success === false && json.error?.code === 'Unauthorized');

    // Auto-refresh access token if 401 Unauthorized occurs and token rotation is possible
    if (
      isUnauthorized &&
      !isRetry &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login')
    ) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        const refreshJson = await refreshRes.json();
        const newToken =
          refreshJson.data?.accessToken || refreshJson.accessToken;

        if (refreshRes.ok && newToken) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', newToken);
          }
          headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient<T>(endpoint, { ...options, headers }, true);
        }
      } catch (refreshErr) {
        console.error('Failed to auto-refresh session token:', refreshErr);
      }

      // If token refresh fails, clear stale token and redirect to login if on a protected route
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        const currentPath = window.location.pathname;
        const isProtectedRoute =
          currentPath.startsWith('/dashboard') ||
          currentPath.startsWith('/admin') ||
          currentPath.startsWith('/agent') ||
          currentPath.startsWith('/live-desk') ||
          currentPath.startsWith('/customers') ||
          currentPath.startsWith('/conversations') ||
          currentPath.startsWith('/billing') ||
          currentPath.startsWith('/profile');

        if (isProtectedRoute && !currentPath.startsWith('/auth')) {
          window.location.href = `/auth?from=${encodeURIComponent(currentPath)}`;
        }
      }
    }

    if (!res.ok || json.success === false) {
      const err: ApiError = json.error || {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      };

      // If persistent 401 occurs, clear stale token and handle redirect only for protected routes
      if (isUnauthorized && typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        const currentPath = window.location.pathname;
        const isProtectedRoute =
          currentPath.startsWith('/dashboard') ||
          currentPath.startsWith('/admin') ||
          currentPath.startsWith('/agent') ||
          currentPath.startsWith('/live-desk') ||
          currentPath.startsWith('/customers') ||
          currentPath.startsWith('/conversations') ||
          currentPath.startsWith('/billing') ||
          currentPath.startsWith('/profile');

        if (isProtectedRoute && !currentPath.startsWith('/auth')) {
          window.location.href = `/auth?from=${encodeURIComponent(currentPath)}`;
        }
      }

      throw new ApiClientError(
        err.code || 'HTTP_ERROR',
        err.message || 'Request failed',
        err.correlationId,
        res.status,
      );
    }

    return json.data as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed',
    );
  }
}
