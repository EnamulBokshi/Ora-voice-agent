'use client';

import React, { useState, useCallback } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { AdminGuard } from './admin-guard';

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <AdminSidebar collapsed={collapsed} onToggle={toggle} />
        <div
          className="flex-1 h-full flex flex-col overflow-hidden transition-[margin] duration-200 ease-out"
          style={{ marginLeft: collapsed ? 64 : 240 }}
        >
          <main className="flex-1 flex flex-col overflow-y-auto">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
