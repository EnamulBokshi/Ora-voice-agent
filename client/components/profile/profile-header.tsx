'use client';

import { ThemeSwitcher } from './theme-switcher';
import { LogoutButton } from '@/components/auth/LogoutButton';

export function ProfileHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Profile & Store Settings
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">
          Manage your merchant identity, credentials, and storefront API access.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <ThemeSwitcher />
        <div className="h-4 w-px bg-border hidden sm:block" />
        <LogoutButton variant="button" />
      </div>
    </div>
  );
}
