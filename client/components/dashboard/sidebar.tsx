'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  MessageSquareText,
  AlertCircle,
  Receipt,
  BarChart2,
  Bell,
  Settings,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../auth/LogoutButton';
import { ThemeToggle } from '../marketing/theme-toggle';
import { getMeApi } from '@/services/auth-service';
import { demoProfile } from '@/lib/demo-data';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  id: string;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: 'My Store',
    items: [
      { id: 'live-desk', label: 'Live Desk', href: '/live-desk', icon: <Radio size={16} /> },
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
      { id: 'agent', label: 'ORA Agent', href: '/agent', icon: <Bot size={16} /> },
    ],
  },
  {
    groupLabel: 'Conversations',
    items: [
      { id: 'conversations', label: 'All Conversations', href: '/conversations', icon: <MessageSquareText size={16} /> },
      { id: 'escalations', label: 'Escalations', href: '/conversations?filter=escalated', icon: <AlertCircle size={16} /> },
    ],
  },
  {
    groupLabel: 'Billing',
    items: [
      { id: 'billing', label: 'Invoices', href: '/billing', icon: <Receipt size={16} /> },
      { id: 'usage', label: 'Usage', href: '/billing?tab=usage', icon: <BarChart2 size={16} /> },
    ],
  },
  {
    groupLabel: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications', href: '/profile?tab=notifications', icon: <Bell size={16} /> },
      { id: 'settings', label: 'Settings', href: '/profile', icon: <Settings size={16} /> },
    ],
  },
];

// All nav items flattened for active-state matching
const allNavItems = navGroups.flatMap((g) => g.items);

function navIdFromPath(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  const match = allNavItems.find(
    (item) =>
      item.href !== '/dashboard' &&
      !item.href.includes('?') &&
      pathname.startsWith(item.href),
  );
  return match?.id ?? 'dashboard';
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const activeId = navIdFromPath(pathname);
  const [userName, setUserName] = useState<string>('Profile');
  const [userRole, setUserRole] = useState<string>('Owner');

  const roleLabel = (raw: string): string => {
    const map: Record<string, string> = { owner: 'Owner', admin: 'Admin', staff: 'Staff' };
    return map[raw.toLowerCase()] ?? raw;
  };

  useEffect(() => {
    let active = true;
    getMeApi()
      .then((data) => {
        if (active) {
          setUserName(data?.user?.name ?? demoProfile.user.name);
          const rawRole = (data?.user as { role?: string })?.role ?? 'owner';
          setUserRole(roleLabel(rawRole));
        }
      })
      .catch(() => {
        if (active) {
          setUserName(demoProfile.user.name);
          setUserRole('Owner');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-50 border-r border-border bg-surface-lowest transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-[232px]',
      )}
    >
      {/* ── Logo + collapse toggle ─────────────────────────────────────── */}
      <div
        className={cn(
          'h-14 flex items-center border-b border-border flex-shrink-0',
          collapsed ? 'justify-center px-0' : 'justify-between px-3.5',
        )}
      >
        {collapsed ? (
          <Link href="/" title="ORA Landing Page" aria-label="ORA Landing Page" className="w-8 h-8 rounded-md flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm select-none hover:opacity-90 transition-opacity">
            O
          </Link>
        ) : (
          <Link href="/" title="ORA Landing Page" aria-label="ORA Landing Page" className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity">
            <span className="w-7 h-7 rounded-md flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm select-none flex-shrink-0">
              O
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none tracking-tight text-foreground">ORA</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.12em] mt-0.5">
                Command center
              </p>
            </div>
          </Link>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors flex-shrink-0',
            collapsed && 'absolute bottom-[5.5rem] left-1/2 -translate-x-1/2',
          )}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav
        className={cn(
          'flex-1 py-3 flex flex-col overflow-y-auto no-scrollbar',
          collapsed ? 'px-2 gap-0.5' : 'px-3 gap-0',
        )}
      >
        {navGroups.map((group) => (
          <div key={group.groupLabel} className={cn('flex flex-col', collapsed ? 'gap-0.5 mb-2' : 'mb-3')}>
            {/* Group label — hidden when collapsed */}
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/60 select-none">
                {group.groupLabel}
              </p>
            )}
            {/* Divider in collapsed mode */}
            {collapsed && (
              <div className="h-px bg-border mx-1 mb-1 opacity-50" />
            )}

            {group.items.map((item) => {
              const isActive = item.id === activeId;

              if (collapsed) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-label={item.label}
                    title={item.label}
                    className={cn(
                      'w-9 h-9 rounded-md flex items-center justify-center transition-colors mx-auto',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
                    )}
                  >
                    {item.icon}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className={cn('h-px bg-border flex-shrink-0', collapsed ? 'mx-2' : 'mx-3')} />

      {/* ── User card / footer ────────────────────────────────────────── */}
      <div className={cn('py-3 flex-shrink-0', collapsed ? 'px-2 flex flex-col items-center gap-1.5' : 'px-3')}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/profile"
              aria-label={userName}
              title={userName}
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                activeId === 'settings'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
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
              'flex items-center justify-between rounded-md px-2.5 py-2 transition-colors',
              activeId === 'settings'
                ? 'bg-primary/10'
                : 'hover:bg-surface-high',
            )}
          >
            <Link
              href="/profile"
              aria-label={userName}
              title={userName}
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              {/* Avatar initials */}
              <span className="w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 text-primary text-[11px] font-bold select-none uppercase flex-shrink-0">
                {userName.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground leading-none truncate">
                  {userName}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                  {userRole}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link
                href="/profile"
                aria-label="Account settings"
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight size={14} />
              </Link>
              <LogoutButton variant="icon" className="flex-shrink-0" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
