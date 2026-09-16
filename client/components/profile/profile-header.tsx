'use client';

import { Settings } from 'lucide-react';
import { ThemeSwitcher } from './theme-switcher';
import { LogoutButton } from '@/components/auth/LogoutButton';

export function ProfileHeader() {
  return (
    <div className="border-b border-border/40 pb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
              <Settings size={15} className="text-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Settings
            </h1>
          </div>

          <p className="text-xs sm:text-[13px] text-muted-foreground">
            Manage store details, merchant account, and platform preferences.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ThemeSwitcher />
          <div className="h-4 w-px bg-border/40 hidden sm:block" />
          <LogoutButton variant="button" />
        </div>
      </div>
    </div>
  );
}
