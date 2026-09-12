import { ApiResponse, ApiError } from '@/types/auth';
import { getSessionStrategy } from './session';

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

  // Automatically attach current browser origin so backend generates matching links
  if (typeof window !== 'undefined' && window.location?.origin && !headers['x-client-origin']) {
    headers['x-client-origin'] = window.location.origin;
  }

  // Automatically attach Bearer access token via session strategy if available and not set
  if (typeof window !== 'undefined' && !headers['Authorization']) {
    const token = await getSessionStrategy().getToken();
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
      (json.success === false && json.error?.code === 'UNAUTHORIZED');

    const isForbidden =
      res.status === 403 ||
      (json.success === false && json.error?.code === 'Forbidden');

    const shouldAttemptRefresh =
      (isUnauthorized || isForbidden) &&
      !isRetry &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/shopify/session');

    // Auto-refresh access token if Unauthorized or Forbidden occurs
    if (shouldAttemptRefresh) {
      try {
        const strategy = getSessionStrategy();
        const newToken = await strategy.refresh();

        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient<T>(endpoint, { ...options, headers }, true);
        }
      } catch (refreshErr) {
        console.error('Failed to auto-refresh session token:', refreshErr);
      }

      // If token refresh fails, clear stale session and redirect to login if on a standalone protected route
      if (typeof window !== 'undefined') {
        const strategy = getSessionStrategy();
        strategy.clear();

        const currentPath = window.location.pathname;
        const isShopify = currentPath.startsWith('/shopify');

        if (!isShopify) {
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
    }

    if (!res.ok || json.success === false) {
      const err: ApiError = json.error || {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      };

      // If persistent 401 occurs, clear stale token for non-Shopify routes
      if (isUnauthorized && typeof window !== 'undefined') {
        const strategy = getSessionStrategy();
        strategy.clear();

        const currentPath = window.location.pathname;
        const isShopify = currentPath.startsWith('/shopify');

        if (!isShopify) {
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

      throw new ApiClientError(err.code, err.message, err.correlationId, res.status);
    }

    return json.data as T;
  } catch (err: any) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      'NETWORK_ERROR',
      err.message || 'Unable to connect to the server. Please check your connection.',
    );
  }
}
