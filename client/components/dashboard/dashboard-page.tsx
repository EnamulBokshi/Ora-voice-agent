'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopHeader } from './top-header';

type DashboardPageProps = ComponentProps<typeof TopHeader> & {
  /**
   * `scroll` (default) gives the body its own scroll area and the standard
   * `px-4 sm:px-6 py-5` gutter. `fill` hands the page a bare flex column for
   * split panes and editors that manage their own scrolling.
   */
  layout?: 'scroll' | 'fill';
  /** Rendered in place of the body while the page's first load is in flight. */
  loading?: boolean;
  loadingLabel?: string;
  /** Rendered between the top bar and the body, outside the scroll area. */
  banner?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * The one layout every dashboard page shares: a thin top bar carrying the title,
 * breadcrumb, badge and actions, then the page body.
 */
export function DashboardPage({
  layout = 'scroll',
  loading = false,
  loadingLabel = 'Loading…',
  banner,
  bodyClassName,
  children,
  ...header
}: DashboardPageProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 h-full min-w-0 overflow-hidden bg-background">
      <TopHeader {...header} />
      {banner}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-muted-foreground" size={18} />
            <span className="text-sm font-medium">{loadingLabel}</span>
          </div>
        </div>
      ) : layout === 'fill' ? (
        <div className={cn('flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden', bodyClassName)}>
          {children}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className={cn('w-full px-4 sm:px-6 py-5 space-y-6', bodyClassName)}>{children}</div>
        </div>
      )}
    </div>
  );
}
