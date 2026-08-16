'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getMeApi } from '@/services/auth-service';
import { Loader2 } from 'lucide-react';

interface DashboardGuardProps {
  children: React.ReactNode;
}

export function DashboardGuard({ children }: DashboardGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const profile = await getMeApi(token || undefined);

        if (!mounted) return;

        const role = profile?.user?.role;
        const isAdminUser = role === 'admin' || role === 'super_admin';
        const isMerchantUser = role === 'owner' || role === 'staff';

        if (isAdminUser) {
          // Admin & SuperAdmin accounts have no merchant dashboard; navigate strictly to /admin
          router.replace('/admin');
        } else if (isMerchantUser) {
          // Merchant/store operators (owner, staff)
          setIsAuthorized(true);
        } else {
          // Regular 'user' role or unprivileged account cannot access store dashboard
          router.replace('/');
        }
      } catch {
        if (!mounted) return;
        router.replace(`/auth?from=${encodeURIComponent(pathname || '/dashboard')}`);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-container px-6 py-4 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-foreground">Verifying workspace permissions...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
