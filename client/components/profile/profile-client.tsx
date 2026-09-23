'use client';

import { useEffect, useState } from 'react';
import { getMeApi } from '@/services/auth-service';
import { ProfileResponseData } from '@/types/auth';
import { demoProfile } from '@/lib/demo-data';
import { withDemoFallback } from '@/lib/demo-config';
import { DashboardPage } from '@/components/dashboard/dashboard-page';
import { ThemeSwitcher } from './theme-switcher';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { AccountDetailsCard } from './account-details-card';
import { BusinessDetailsCard } from './business-details-card';

export function ProfileClient() {
  const [profile, setProfile] = useState<ProfileResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getMeApi()
      .then((data) => {
        if (active) setProfile(withDemoFallback(data, demoProfile));
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load profile:', err);
          setProfile(withDemoFallback(null, demoProfile));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const headerActions = (
    <div className="flex items-center gap-3">
      <ThemeSwitcher />
      <div className="h-4 w-px bg-border/40 hidden sm:block" />
      <LogoutButton variant="button" />
    </div>
  );

  return (
    <DashboardPage
      title="Settings"
      actions={headerActions}
      loading={loading}
      loadingLabel="Loading profile…"
    >
      {error || !profile ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {error ?? 'Profile unavailable.'}
        </div>
      ) : (
        <>
          <BusinessDetailsCard
            business={profile.business}
            onBusinessUpdated={(updated) =>
              setProfile((prev) => (prev ? { ...prev, business: updated } : prev))
            }
          />
          <AccountDetailsCard
            user={profile.user}
            onUserUpdated={(updated) =>
              setProfile((prev) => (prev ? { ...prev, user: updated } : prev))
            }
          />
        </>
      )}
    </DashboardPage>
  );
}
