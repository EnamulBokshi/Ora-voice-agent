'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Users,
  Radio,
  Server,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../auth/LogoutButton';
import { ThemeToggle } from '../marketing/theme-toggle';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { id: 'overview', label: 'Platform Overview', href: '/admin', icon: <LayoutDashboard size={16} /> },
  { id: 'merchants', label: 'Merchants & Stores', href: '/admin/merchants', icon: <Store size={16} /> },
  { id: 'users', label: 'Users & RBAC', href: '/admin/users', icon: <Users size={16} /> },
  { id: 'voice-monitor', label: 'AI Voice Monitor', href: '/admin/voice-monitor', icon: <Radio size={16} /> },
  { id: 'system', label: 'System Diagnostics', href: '/admin/system', icon: <Server size={16} /> },
];

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen z-40 flex flex-col border-r border-border bg-surface-low transition-all duration-200 ease-out select-none',
        collapsed ? 'w-16' : 'w-[240px]',
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3.5 py-4 border-b border-border min-h-[64px]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black tracking-wider text-sm shadow-md shadow-primary/20">
              ⚡
            </div>
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-foreground">ORA SYSTEM</span>
                <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-primary/15 text-primary">
                  ROOT
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                SuperAdmin Command
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm">
            ⚡
          </div>
        )}

        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors',
            collapsed && 'hidden',
          )}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1.5">
        {!collapsed && (
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Platform Management
          </div>
        )}

        {adminNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all',
                active
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20'
                  : 'text-muted-foreground hover:bg-surface-high hover:text-foreground',
                collapsed && 'justify-center px-0 py-2.5',
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={cn('shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {!collapsed && (
          <div className="pt-4 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Store Workspace
          </div>
        )}

        {/* Quick Link to Merchant Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-high hover:text-foreground transition-all',
            collapsed && 'justify-center px-0 py-2.5',
          )}
          title={collapsed ? 'Switch to Store Dashboard' : undefined}
        >
          <Shield size={16} className="shrink-0 text-muted-foreground group-hover:text-foreground" />
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <span className="truncate">Merchant View</span>
              <ArrowUpRight size={13} className="text-muted-foreground group-hover:text-foreground" />
            </div>
          )}
        </Link>
      </div>

      {/* Footer / Controls */}
      <div className="border-t border-border p-2.5 flex flex-col gap-2 bg-surface-lowest">
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'justify-between px-1')}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-mono text-muted-foreground">SYSTEM LIVE</span>
            </div>
          )}
          <ThemeToggle />
        </div>

        <div className="w-full flex justify-center">
          <LogoutButton variant={collapsed ? 'icon' : 'sidebar'} />
        </div>
      </div>
    </aside>
  );
}
