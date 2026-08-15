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

    async function checkSuperAdmin() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const profile = await getMeApi(token || undefined);

        if (!mounted) return;

        if (profile?.user?.role === 'super_admin') {
          setUser(profile.user);
          setIsAuthorized(true);
        } else {
          // Merchant or non-admin attempting to access /admin
          router.replace('/dashboard');
        }
      } catch (err) {
        if (!mounted) return;
        router.replace('/auth?from=/admin');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkSuperAdmin();

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
              VERIFYING SUPERADMIN PRIVILEGES
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
            This sector is strictly reserved for ORA Platform SuperAdministrators. Redirecting you to your store dashboard...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
