'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Users,
  Radio,
  Coins,
  Server,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Ticket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../auth/LogoutButton';
import { ThemeToggle } from '../marketing/theme-toggle';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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
  { id: 'plans', label: 'Plans & Pricing', href: '/admin/plans', icon: <CreditCard size={16} /> },
  { id: 'coupons', label: 'Coupons', href: '/admin/coupons', icon: <Ticket size={16} /> },
  { id: 'token-usage', label: 'Token & Cost OpEx', href: '/admin/token-usage', icon: <Coins size={16} /> },
  { id: 'users', label: 'Users & RBAC', href: '/admin/users', icon: <Users size={16} /> },
  { id: 'voice-monitor', label: 'AI Voice Monitor', href: '/admin/voice-monitor', icon: <Radio size={16} /> },
  { id: 'system', label: 'Platform & System', href: '/admin/system', icon: <Server size={16} /> },
];

export function AdminSidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-screen z-50 flex flex-col border-r border-border bg-surface-low transition-all duration-200 ease-out select-none',
          // Mobile state: slide in/out
          mobileOpen
            ? 'translate-x-0 w-[260px] shadow-2xl'
            : '-translate-x-full md:translate-x-0',
          // Desktop state: collapsed or expanded
          collapsed ? 'md:w-16' : 'md:w-[240px]',
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3.5 py-4 border-b border-border min-h-[64px]">
          {(!collapsed || mobileOpen) ? (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm tracking-wider">
                O
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-foreground block">
                  ORA PLATFORM
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest block">
                  SUPERADMIN HQ
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              O
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <div className="hidden md:block">
            {!collapsed && (
              <button
                onClick={onToggle}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                aria-label="Collapse Sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>

          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors md:hidden"
              aria-label="Close Mobile Sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Collapsed Toggle Button on desktop when closed */}
        {collapsed && (
          <div className="py-2 hidden md:flex justify-center border-b border-border">
            <button
              onClick={onToggle}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
              aria-label="Expand Sidebar"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {(!collapsed || mobileOpen) && (
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Platform Management
            </div>
          )}

          {adminNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all',
                  collapsed && !mobileOpen ? 'md:justify-center md:px-0 md:py-2.5' : '',
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-surface-high hover:text-foreground',
                )}
                title={collapsed && !mobileOpen ? item.label : undefined}
              >
                <span className={cn('shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                  {item.icon}
                </span>
                {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Footer / Controls */}
        <div className="border-t border-border p-2.5 flex flex-col gap-2 bg-surface-lowest">
          <div className={cn('flex items-center', collapsed && !mobileOpen ? 'md:flex-col md:gap-2' : 'justify-between px-1')}>
            {(!collapsed || mobileOpen) && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[11px] font-mono text-muted-foreground">SYSTEM LIVE</span>
              </div>
            )}
            <ThemeToggle />
          </div>

          <div className="w-full flex justify-center">
            <LogoutButton variant={collapsed && !mobileOpen ? 'icon' : 'sidebar'} />
          </div>
        </div>
      </aside>
    </>
  );
}
