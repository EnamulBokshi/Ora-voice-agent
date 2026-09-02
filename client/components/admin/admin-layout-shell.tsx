'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { AdminGuard } from './admin-guard';
import { Menu, ShieldCheck } from 'lucide-react';

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const toggleMobile = useCallback(() => setMobileOpen((m) => !m), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <AdminSidebar
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={closeMobile}
        />

        <div
          className="flex-1 h-full flex flex-col overflow-hidden transition-[margin] duration-200 ease-out"
          style={{ marginLeft: isDesktop ? (collapsed ? 64 : 240) : 0 }}
        >
          {/* Mobile Top Navigation Bar */}
          <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-surface-low shrink-0 min-h-[56px] z-30">
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleMobile}
                className="p-1.5 rounded-lg border border-border bg-surface-high text-foreground hover:bg-surface-bright transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>

              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  O
                </div>
                <span className="font-bold text-xs tracking-tight text-foreground">
                  ORA ADMIN
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              <ShieldCheck size={10} />
              SuperAdmin
            </span>
          </div>

          <main className="flex-1 flex flex-col overflow-y-auto">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
