import { SessionStrategy, UnifiedSession } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export class WebSessionStrategy implements SessionStrategy {
  async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  async refresh(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const newToken = json.data?.accessToken || json.accessToken;

      if (newToken) {
        localStorage.setItem('accessToken', newToken);
        if (json.data?.role) {
          const isProd = process.env.NODE_ENV === 'production';
          document.cookie = `userRole=${json.data.role}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
        }
        return newToken;
      }
    } catch {
      // Refresh network error
    }

    return null;
  }

  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }

  async getSession(): Promise<UnifiedSession | null> {
    const token = await this.getToken();
    if (!token) return null;
    return { accessToken: token };
  }
}
