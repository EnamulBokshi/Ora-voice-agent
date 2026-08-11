import { ApiResponse, ApiError } from '@/types/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api';

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
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

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

    if (!res.ok || json.success === false) {
      const err: ApiError = json.error || {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      };

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
