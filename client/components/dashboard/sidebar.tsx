'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  MessageSquareText,
  Receipt,
  BarChart2,
  Bell,
  Settings,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Mic,
  FileText,
  Package,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../auth/LogoutButton';
import { ThemeToggle } from '../marketing/theme-toggle';
import { getMeApi } from '@/services/auth-service';
import { demoProfile } from '@/lib/demo-data';
import {
  NavLink,
  NavSubLink,
  NavIconButton,
  type NavGroupDef,
} from './nav-item';

// ─── Nav definition ───────────────────────────────────────────────────────────

const navGroups: NavGroupDef[] = [
  {
    groupLabel: 'My Store',
    items: [
      { id: 'dashboard',     label: 'Overview',         href: '/dashboard',  icon: <LayoutDashboard size={15} /> },
      { id: 'live-desk',     label: 'Live Desk',        href: '/live-desk',  icon: <Radio size={15} /> },
      {
        id: 'agent',
        label: 'ORA Agent',
        href: '/agent',
        icon: <Bot size={15} />,
        subItems: [
          { id: 'agent-voice',       label: 'Talk to ORA',       href: '/agent?tab=voice',       icon: <Mic size={13} />,      tabKey: 'voice' },
          { id: 'agent-documents',   label: 'Documents',         href: '/agent?tab=documents',   icon: <FileText size={13} />, tabKey: 'documents' },
          { id: 'agent-products',    label: 'Product Catalog',   href: '/agent?tab=products',    icon: <Package size={13} />,  tabKey: 'products' },
          { id: 'agent-integration', label: 'Integration',       href: '/agent?tab=integration', icon: <Key size={13} />,      tabKey: 'integration' },
        ],
      },
    ],
  },
  {
    groupLabel: 'Conversations',
    items: [
      { id: 'conversations', label: 'All Conversations', href: '/conversations',             icon: <MessageSquareText size={15} /> },
    ],
  },
  {
    groupLabel: 'Billing',
    items: [
      { id: 'billing',       label: 'Invoices',         href: '/billing',                   icon: <Receipt size={15} /> },
      { id: 'usage',         label: 'Usage',            href: '/billing?tab=usage',         icon: <BarChart2 size={15} /> },
    ],
  },
  {
    groupLabel: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications',    href: '/notifications',             icon: <Bell size={15} /> },
      { id: 'settings',      label: 'Settings',         href: '/profile',                   icon: <Settings size={15} /> },
    ],
  },
];

// ─── Active ID resolver ───────────────────────────────────────────────────────

const allNavItems = navGroups.flatMap((g) => g.items);

function getActiveNavId(
  pathname: string,
  searchParams: { get: (name: string) => string | null },
): string {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/live-desk'))    return 'live-desk';
  if (pathname.startsWith('/agent'))        return 'agent';
  if (pathname.startsWith('/conversations')) return 'conversations';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/billing'))
    return searchParams.get('tab') === 'usage' ? 'usage' : 'billing';
  if (pathname.startsWith('/profile'))
    return searchParams.get('tab') === 'notifications' ? 'notifications' : 'settings';

  const match = allNavItems.find(
    (item) => !item.href.includes('?') && pathname.startsWith(item.href),
  );
  return match?.id ?? 'dashboard';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const activeTab     = searchParams.get('tab') || 'voice';
  const activeId      = getActiveNavId(pathname, searchParams);

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
    return () => { active = false; };
  }, []);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-50 border-r border-border bg-surface-lowest transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-[240px]',
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'h-14 flex items-center border-b border-border flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {collapsed ? (
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <PanelLeftOpen size={17} />
          </button>
        ) : (
          <>
            <Link
              href="/"
              title="ORA"
              aria-label="ORA Home"
              className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
            >
              {/* Wordmark-style logo */}
              <div className="flex-shrink-0 w-6 h-6 rounded bg-primary flex items-center justify-center">
                <span className="text-[11px] font-black text-primary-foreground tracking-tight select-none">O</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-none text-foreground tracking-tight">ORA</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-0.5 tracking-wide">
                  Command Center
                </p>
              </div>
            </Link>
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors flex-shrink-0"
            >
              <PanelLeftClose size={15} />
            </button>
          </>
        )}
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        className={cn(
          'flex-1 py-3 overflow-y-auto no-scrollbar',
          collapsed ? 'px-2' : 'px-3',
        )}
        aria-label="Main navigation"
      >
        {navGroups.map((group, groupIdx) => (
          <div key={group.groupLabel}>
            {/* Thin divider between groups (no labels) */}
            {groupIdx > 0 && !collapsed && (
              <div className="h-px bg-border mx-1 my-2 opacity-60" />
            )}
            {groupIdx > 0 && collapsed && (
              <div className="h-px bg-border mx-2 my-2 opacity-60" />
            )}

            <div className={cn('flex flex-col', collapsed ? 'gap-1 items-center' : 'gap-0.5')}>
              {group.items.map((item) => {
                const isParentActive = item.id === activeId;

                if (collapsed) {
                  return (
                    <div key={item.id} className="flex flex-col items-center gap-1">
                      <NavIconButton item={item} isActive={isParentActive} />
                      {/* Collapsed sub-items: tiny dots below parent icon */}
                      {isParentActive && item.subItems && (
                        <div className="flex flex-col gap-1 items-center pb-1">
                          {item.subItems.map((sub) => {
                            const isSubActive =
                              pathname.startsWith('/agent') && activeTab === sub.tabKey;
                            return (
                              <Link
                                key={sub.id}
                                href={sub.href}
                                aria-label={sub.label}
                                title={sub.label}
                                className={cn(
                                  'w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors',
                                  isSubActive
                                    ? 'bg-surface-high text-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
                                )}
                              >
                                {sub.icon}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={item.id}>
                    <NavLink item={item} isActive={isParentActive} />
                    {/* Sub-items tree */}
                    {isParentActive && item.subItems && (
                      <div className="flex flex-col gap-0.5 mt-0.5 mb-1">
                        {item.subItems.map((sub) => {
                          const isSubActive =
                            pathname.startsWith('/agent') && activeTab === sub.tabKey;
                          return (
                            <NavSubLink key={sub.id} sub={sub} isActive={isSubActive} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className={cn('h-px bg-border flex-shrink-0', collapsed ? 'mx-2' : 'mx-3')} />

      {/* ── User footer ──────────────────────────────────────────────────── */}
      <div className={cn('py-3 flex-shrink-0', collapsed ? 'px-2 flex flex-col items-center gap-2' : 'px-3')}>
        {collapsed ? (
          <>
            <ThemeToggle />
            <Link
              href="/profile"
              aria-label={userName}
              title={userName}
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                activeId === 'settings'
                  ? 'bg-surface-high text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <span className="w-6 h-6 rounded-md flex items-center justify-center bg-surface-high text-foreground text-[11px] font-bold select-none uppercase">
                {userName.charAt(0)}
              </span>
            </Link>
            <LogoutButton variant="icon" />
          </>
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-surface-high transition-colors group">
            {/* Avatar */}
            <Link href="/profile" className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="w-7 h-7 rounded-md flex items-center justify-center bg-surface-high text-foreground text-[12px] font-bold select-none uppercase flex-shrink-0 border border-border">
                {userName.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-foreground truncate leading-tight">
                  {userName}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">{userRole}</p>
              </div>
            </Link>

            {/* Actions: theme toggle + logout */}
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <ThemeToggle />
              <LogoutButton variant="icon" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
