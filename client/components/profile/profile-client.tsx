'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getMeApi } from '@/services/auth-service';
import { ProfileResponseData } from '@/types/auth';
import { demoProfile } from '@/lib/demo-data';
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
        if (active) setProfile(data ?? demoProfile);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load profile');
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
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        {error ?? 'Profile unavailable.'}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1200px] mx-auto w-full space-y-6">
      <ProfileHeader />
      <BusinessDetailsCard business={profile.business} />
      <AccountDetailsCard user={profile.user} />
    </div>
  );
}
