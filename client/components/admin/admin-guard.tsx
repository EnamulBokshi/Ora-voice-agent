'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMeApi } from '@/services/auth-service';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { User } from '@/types/auth';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdminAccess() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const profile = await getMeApi(token || undefined);

        if (!mounted) return;

        const role = profile?.user?.role;
        const isAdminUser = role === 'admin' || role === 'super_admin';
        const isMerchantUser = role === 'owner' || role === 'staff';

        if (isAdminUser) {
          setUser(profile.user);
          setIsAuthorized(true);
        } else if (isMerchantUser) {
          // Merchant attempting to access /admin -> redirect to /dashboard
          router.replace('/dashboard');
        } else {
          // Regular 'user' role cannot access /admin -> redirect to /
          router.replace('/');
        }
      } catch (err) {
        if (!mounted) return;
        router.replace('/auth?from=/admin');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkAdminAccess();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface-container p-8 shadow-2xl">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold tracking-wider text-foreground">
              VERIFYING ADMINISTRATOR PRIVILEGES
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Authenticating session with ORA Global Access Gateway...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center shadow-2xl">
          <ShieldAlert className="h-10 w-10 text-destructive" />
          <h2 className="text-base font-bold text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground">
            This sector is strictly reserved for ORA Platform Administrators. Redirecting you to your store dashboard...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

