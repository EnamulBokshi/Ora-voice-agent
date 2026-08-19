'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getMeApi } from '@/services/auth-service';
import { ProfileResponseData } from '@/types/auth';
import { demoProfile } from '@/lib/demo-data';
import { withDemoFallback } from '@/lib/demo-config';
import { ProfileHeader } from './profile-header';
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm font-medium">Loading profile…</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground bg-background px-6">
        {error ?? 'Profile unavailable.'}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-8 bg-background">
      <ProfileHeader />
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
    </div>
  );
}
