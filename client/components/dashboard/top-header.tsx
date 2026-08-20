'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopHeaderProps {
  title: string;
  /** Optional breadcrumb one level up */
  breadcrumb?: { label: string; href: string };
  /** Optional badge shown right after the title (e.g. LIVE pill) */
  badge?: ReactNode;
  /** Optional action area on the right — overrides default date+refresh */
  actions?: ReactNode;
  /** Refresh callback — shown as an icon button when no custom actions */
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopHeader({
  title,
  breadcrumb,
  badge,
  actions,
  onRefresh,
  isRefreshing,
}: TopHeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-border bg-background">
      {/* Left: breadcrumb + title + optional badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        {breadcrumb && (
          <>
            <Link
              href={breadcrumb.href}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {breadcrumb.label}
            </Link>
            <span className="text-border text-sm">/</span>
          </>
        )}
        <h1 className="text-[14px] font-semibold text-foreground tracking-tight truncate">
          {title}
        </h1>
        {badge && badge}
      </div>

      {/* Right: custom actions OR default date + refresh */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions ? (
          actions
        ) : (
          <>
            <span className="text-[12px] text-muted-foreground hidden sm:block">{today}</span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh data"
                title="Refresh data"
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors disabled:opacity-40"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
