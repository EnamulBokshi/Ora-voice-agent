'use client';

import { User } from 'lucide-react';
import { ThemeSwitcher } from './theme-switcher';
import { LogoutButton } from '@/components/auth/LogoutButton';

export function ProfileHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2.5">
          <User size={18} className="text-muted-foreground" />
          Profile
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Your merchant account and user details.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <ThemeSwitcher />
        <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />
        <LogoutButton variant="button" />
      </div>
    </div>
  );
}


