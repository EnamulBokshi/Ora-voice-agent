'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardGuard } from '@/components/dashboard/dashboard-guard';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const pathname = usePathname();

  // Navigating from inside the drawer should dismiss it.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape closes the drawer, matching the rest of the dashboard's overlays.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <DashboardGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Backdrop for the mobile drawer. */}
        {mobileOpen && (
          <div
            onClick={closeMobile}
            aria-hidden="true"
            className="md:hidden fixed inset-0 z-40 bg-black/50"
          />
        )}

        <Suspense fallback={null}>
          <Sidebar
            collapsed={collapsed}
            onToggle={toggle}
            mobileOpen={mobileOpen}
            onMobileClose={closeMobile}
          />
        </Suspense>

        {/*
          Main content column. The left offset used to be an inline
          `style={{ marginLeft: collapsed ? 64 : 240 }}` with no media query, so on a
          390px phone the fixed 240px sidebar took 62% of the viewport and squeezed the
          content into ~150px. The offset now only applies from `md` up, where the
          sidebar is actually docked.
        */}
        <div
          className={cn(
            'flex-1 h-full flex flex-col min-w-0 overflow-hidden transition-[margin] duration-200 ease-out',
            collapsed ? 'md:ml-16' : 'md:ml-[240px]',
          )}
        >
          {/* Mobile-only bar carrying the drawer trigger. */}
          <div className="md:hidden h-12 flex items-center justify-between px-3 border-b border-border bg-surface-lowest flex-shrink-0 z-20">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-border/60 bg-surface-high/40 text-foreground hover:bg-surface-high transition-colors cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Menu size={16} />
              </button>
              <span className="text-[13px] font-semibold text-foreground tracking-tight font-serif">ORA</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[color:var(--status-online)]" title="System operational" />
            </div>
          </div>

          {/* Page content is responsible for its own TopHeader and scroll area */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</main>
        </div>
      </div>
    </DashboardGuard>
  );
}
