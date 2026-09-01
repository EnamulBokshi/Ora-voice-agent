'use client';

import { Settings } from 'lucide-react';
import { ThemeSwitcher } from './theme-switcher';
import { LogoutButton } from '@/components/auth/LogoutButton';

export function ProfileHeader() {
  return (
    <div className="border-b border-border/40 pb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
              <Settings size={14} className="text-foreground" />
            </div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground">
              ORA Store Configuration
            </span>
          </div>

          <h1 className="text-[24px] sm:text-[28px] font-semibold text-foreground font-serif tracking-tight leading-[1.2] mb-1.5">
            Store & Account Settings
          </h1>

          <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
            Manage your merchant identity, credentials, and storefront voice widget API credentials.
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
