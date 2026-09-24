'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, UserRole, Business, AuthResponseData } from '@/types/auth';
import { getMeApi, logoutApi, clearProfileCache } from '@/services/auth-service';

export interface AuthContextType {
  user: User | null;
  business: Business | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: { accessToken: string; user: User; business?: Business | null }) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncUserCookie = useCallback((userRole: UserRole) => {
    if (typeof document !== 'undefined' && userRole) {
      const isProd = process.env.NODE_ENV === 'production';
      document.cookie = `userRole=${userRole}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
    }
  }, []);

  const clearAuthCookies = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  }, []);

  const login = useCallback(
    (data: { accessToken: string; user: User; business?: Business | null }) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', data.accessToken);
      }
      syncUserCookie(data.user.role);
      setUser(data.user);
      setBusiness(data.business ?? null);
      setRole(data.user.role);
      setIsAuthenticated(true);
      setIsLoading(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ora:auth-change', {
            detail: { action: 'login', user: data.user },
          }),
        );
      }
    },
    [syncUserCookie],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearProfileCache();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        window.dispatchEvent(
          new CustomEvent('ora:auth-change', {
            detail: { action: 'logout' },
          }),
        );
      }
      clearAuthCookies();
      setUser(null);
      setBusiness(null);
      setRole(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [clearAuthCookies]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await getMeApi(undefined, true);
      if (res?.user) {
        setUser(res.user);
        setBusiness(res.business ?? null);
        setRole(res.user.role);
        setIsAuthenticated(true);
        syncUserCookie(res.user.role);
        return res.user;
      }
    } catch (err: any) {
      if (err?.code === 'UNAUTHORIZED' || err?.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
        clearAuthCookies();
        clearProfileCache();
        setUser(null);
        setBusiness(null);
        setRole(null);
        setIsAuthenticated(false);
      }
    }
    return null;
  }, [clearAuthCookies, syncUserCookie]);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const hasLocalToken = Boolean(localStorage.getItem('accessToken'));
      const hasCookieRole = document.cookie.includes('userRole=');

      // If neither token nor role cookie exists, user is definitely logged out
      if (!hasLocalToken && !hasCookieRole) {
        if (!cancelled) {
          setUser(null);
          setBusiness(null);
          setRole(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await getMeApi();
        if (!cancelled) {
          if (res?.user) {
            setUser(res.user);
            setBusiness(res.business ?? null);
            setRole(res.user.role);
            setIsAuthenticated(true);
            syncUserCookie(res.user.role);
          } else {
            setUser(null);
            setBusiness(null);
            setRole(null);
            setIsAuthenticated(false);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err?.code === 'UNAUTHORIZED' || err?.status === 401) {
            localStorage.removeItem('accessToken');
            clearAuthCookies();
            clearProfileCache();
            setUser(null);
            setBusiness(null);
            setRole(null);
            setIsAuthenticated(false);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    // Cross-tab synchronization
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        if (!e.newValue) {
          setUser(null);
          setBusiness(null);
          setRole(null);
          setIsAuthenticated(false);
        } else {
          checkAuth();
        }
      }
    };

    // Intra-tab custom event
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ action: string; user?: User }>;
      if (customEvent.detail?.action === 'logout') {
        setUser(null);
        setBusiness(null);
        setRole(null);
        setIsAuthenticated(false);
      } else if (customEvent.detail?.action === 'login') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('ora:auth-change', handleAuthChange);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ora:auth-change', handleAuthChange);
    };
  }, [clearAuthCookies, syncUserCookie]);

  const value = useMemo(
    () => ({
      user,
      business,
      role,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, business, role, isAuthenticated, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    // Return a safe fallback if accessed outside AuthProvider to prevent crashes
    return {
      user: null,
      business: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      login: () => {},
      logout: async () => {},
      refreshUser: async () => null,
    };
  }
  return context;
}
