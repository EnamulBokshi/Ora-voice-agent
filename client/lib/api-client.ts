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

    let json: ApiResponse<T> | null = null;
    let responseText = '';

    if (contentType && contentType.includes('application/json')) {
      try {
        json = await res.json();
      } catch {
        json = null;
      }
    } else {
      responseText = await res.text().catch(() => '');
    }

    const isUnauthorized =
      res.status === 401 ||
      (json?.success === false && json?.error?.code === 'UNAUTHORIZED');

    const isForbidden =
      res.status === 403 ||
      (json?.success === false && json?.error?.code === 'Forbidden');

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
            currentPath.startsWith('/orders') ||
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

    if (!res.ok || (json && json.success === false)) {
      let errMsg = 'An unexpected error occurred.';
      let errCode = 'UNKNOWN_ERROR';
      let correlationId: string | undefined = undefined;

      if (json?.error) {
        errCode = json.error.code || errCode;
        errMsg = json.error.message || errMsg;
        correlationId = json.error.correlationId;
      } else if ((json as any)?.message) {
        errMsg = Array.isArray((json as any).message)
          ? (json as any).message.join(', ')
          : (json as any).message;
        errCode = (json as any).error || `HTTP_${res.status}`;
      } else if (responseText) {
        if (responseText.trim().startsWith('<')) {
          errMsg = `Server error (HTTP ${res.status}${res.statusText ? `: ${res.statusText}` : ''})`;
        } else {
          errMsg = responseText.slice(0, 300);
        }
        errCode = `HTTP_${res.status}`;
      } else {
        errMsg = `HTTP request failed with status ${res.status}`;
        errCode = `HTTP_${res.status}`;
      }

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
            currentPath.startsWith('/orders') ||
            currentPath.startsWith('/customers') ||
            currentPath.startsWith('/conversations') ||
            currentPath.startsWith('/billing') ||
            currentPath.startsWith('/profile');

          if (isProtectedRoute && !currentPath.startsWith('/auth')) {
            window.location.href = `/auth?from=${encodeURIComponent(currentPath)}`;
          }
        }
      }

      // Handle 402 PAYMENT_REQUIRED / TRIAL_EXPIRED: redirect to billing page
      if (res.status === 402 && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (
          !currentPath.startsWith('/shopify') &&
          !currentPath.startsWith('/billing') &&
          !currentPath.startsWith('/pricing')
        ) {
          window.location.href = `/billing?expired=true`;
        }
      }

      throw new ApiClientError(errCode, errMsg, correlationId, res.status);
    }

    if (!json) {
      return {} as T;
    }

    return (json.data !== undefined ? json.data : json) as T;
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
