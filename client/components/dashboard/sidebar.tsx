'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquareText,
  Package,
  ShoppingCart,
  Users,
  Receipt,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../auth/LogoutButton';
import { getMeApi } from '@/services/auth-service';
import { demoProfile } from '@/lib/demo-data';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  id: string;
}

const navItems: NavItem[] = [
  { id: 'overview',       label: 'Overview',       href: '/dashboard',     icon: <LayoutDashboard    size={16} /> },
  { id: 'agent',          label: 'Agent Setup',    href: '/agent',         icon: <Bot                size={16} /> },
  { id: 'conversations',  label: 'Conversations',  href: '/conversations', icon: <MessageSquareText  size={16} /> },
  { id: 'catalog',        label: 'Catalog',        href: '/catalog',       icon: <Package            size={16} /> },
  { id: 'orders',         label: 'Orders',         href: '/orders',        icon: <ShoppingCart       size={16} /> },
  { id: 'customers',      label: 'Customers',      href: '/customers',     icon: <Users              size={16} /> },
  { id: 'billing',        label: 'Billing',        href: '/billing',       icon: <Receipt            size={16} /> },
];

function navIdFromPath(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'overview';
  const match = navItems.find((item) => item.href !== '/' && pathname.startsWith(item.href));
  return match?.id ?? 'overview';
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const activeId = navIdFromPath(pathname);
  const [userName, setUserName] = useState<string>('Profile');

  useEffect(() => {
    let active = true;
    getMeApi()
      .then((data) => {
        if (active) setUserName(data?.user?.name ?? demoProfile.user.name);
      })
      .catch(() => {
        if (active) setUserName(demoProfile.user.name);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-50 border-r border-border bg-surface-lowest transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-[232px]'
      )}
    >
      {/* ── Logo + collapse toggle ── */}
      <div
        className={cn(
          'h-16 flex items-center border-b border-border',
          collapsed ? 'justify-center px-0' : 'justify-between px-3.5'
        )}
      >
        {collapsed ? (
          <span className="w-8 h-8 rounded-md flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm select-none">
            O
          </span>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-md flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm select-none">
              O
            </span>
            <div>
              <p className="text-sm font-semibold leading-none tracking-tight text-foreground">ORA</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.12em] mt-0.5">
                Command center
              </p>
            </div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
        {collapsed && (
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav
        className={cn(
          'flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto no-scrollbar',
          collapsed ? 'px-2 items-center' : 'px-3'
        )}
      >
        {navItems.map((item) => {
          const isActive = item.id === activeId;
          const content = (
            <>
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </>
          );
          return collapsed ? (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high'
              )}
            >
              {content}
            </Link>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high'
              )}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div className={cn('my-2 h-px bg-border', collapsed ? 'mx-2' : 'mx-3')} />

      {/* ── Profile & Logout ── */}
      <div className={cn('pb-4', collapsed ? 'px-2 flex flex-col items-center gap-1.5' : 'px-3')}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Link
              href="/profile"
              aria-label={userName}
              title={userName}
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                activeId === 'profile'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high'
              )}
            >
              <span className="w-6 h-6 rounded-md flex items-center justify-center bg-primary/10 text-primary text-[11px] font-bold select-none uppercase">
                {userName.charAt(0)}
              </span>
            </Link>
            <LogoutButton variant="icon" />
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center justify-between rounded-md px-2 py-1.5 transition-colors',
              activeId === 'profile'
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-surface-high text-muted-foreground'
            )}
          >
            <Link
              href="/profile"
              aria-label={userName}
              title={userName}
              className="flex items-center gap-2.5 min-w-0 flex-1 py-0.5 text-[13px] font-medium text-foreground hover:text-primary transition-colors"
            >
              <span className="w-6 h-6 rounded-md flex items-center justify-center bg-primary/10 text-primary text-[11px] font-bold select-none uppercase flex-shrink-0">
                {userName.charAt(0)}
              </span>
              <span className="truncate">{userName}</span>
            </Link>
            <LogoutButton variant="icon" className="flex-shrink-0" />
          </div>
        )}
      </div>
    </aside>
  );
}
