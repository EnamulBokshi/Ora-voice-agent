'use client';

import { useState, useCallback, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardGuard } from '@/components/dashboard/dashboard-guard';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <DashboardGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Suspense fallback={null}>
          <Sidebar collapsed={collapsed} onToggle={toggle} />
        </Suspense>

        {/* Main content column: fills remaining width */}
        <div
          className="flex-1 h-full flex flex-col overflow-hidden transition-[margin] duration-200 ease-out"
          style={{ marginLeft: collapsed ? 64 : 240 }}
        >
          {/* Page content is responsible for its own TopHeader and scroll area */}
          <main className="flex-1 flex overflow-hidden">{children}</main>
        </div>
      </div>
    </DashboardGuard>
  );
}
