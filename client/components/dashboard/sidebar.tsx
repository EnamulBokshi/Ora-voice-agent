import Link from 'next/link';
import {
  LayoutDashboard,
  Radio,
  MessageSquareText,
  Package,
  TrendingUp,
  Bot,
  BarChart3,
  ShoppingCart,
  Users,
  Receipt,
  Settings,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href:  string;
  icon:  React.ReactNode;
  id:    string;
}

const navItems: NavItem[] = [
  { id: 'command',       label: 'Overview',       href: '/',               icon: <LayoutDashboard   size={18} /> },
  { id: 'live-activity', label: 'Live Activity',  href: '/live-activity',  icon: <Radio             size={18} /> },
  { id: 'conversations', label: 'Conversations',  href: '/conversations',  icon: <MessageSquareText size={18} /> },
  { id: 'catalog',       label: 'Catalog',        href: '/catalog',        icon: <Package           size={18} /> },
  { id: 'sales',         label: 'Sales',          href: '/sales',          icon: <TrendingUp        size={18} /> },
  { id: 'agent',         label: 'Agent',          href: '/agent',          icon: <Bot               size={18} /> },
  { id: 'analytics',     label: 'Analytics',      href: '/analytics',      icon: <BarChart3         size={18} /> },
  { id: 'orders',        label: 'Orders',         href: '/orders',         icon: <ShoppingCart      size={18} /> },
  { id: 'customers',    label: 'Customers',      href: '/customers',      icon: <Users             size={18} /> },
  { id: 'billing',      label: 'Billing',        href: '/billing',        icon: <Receipt           size={18} /> },
  { id: 'system',        label: 'System',         href: '/system',         icon: <Settings          size={18} /> },
];

interface SidebarProps {
  activePage?: string;
}

export function Sidebar({ activePage = 'command' }: SidebarProps) {
  return (
    <aside
      className="fixed left-0 top-0 h-full w-[280px] flex flex-col py-6 z-50"
      style={{
        background:   'var(--sidebar)',
        borderRight:  '1px solid var(--sidebar-border)',
      }}
    >

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
          style={{
            background: 'var(--logo-gradient)',
            boxShadow:  'var(--logo-glow)',
          }}
        >
          <span
            className="font-bold text-lg leading-none select-none"
            style={{ color: 'var(--logo-text)' }}
          >
            O
          </span>
        </div>

        <div>
          <p
            className="text-xl font-bold leading-none tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            ORA
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mt-0.5">
            Intelligence
          </p>
        </div>
      </div>

      {/* ── Nav Items ─────────────────────────────────────── */}
      <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = item.id === activePage;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative border-l-4',
                isActive
                  ? 'text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)]'
              )}
              style={
                isActive
                  ? {
                      background:  'var(--nav-active-bg)',
                      borderColor: 'var(--nav-active-border)',
                    }
                  : {}
              }
            >
              <span
                className="transition-colors duration-200 flex-shrink-0"
                style={{ color: isActive ? 'var(--primary)' : undefined }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: 'var(--nav-active-dot)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ───────────────────────────────────────── */}
      <div
        className="mx-4 my-3 h-px"
        style={{ background: 'var(--border)' }}
      />

      {/* ── Merchant Profile ──────────────────────────────── */}
      <div className="px-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)] transition-all duration-200 text-xs font-medium group"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--toggle-bg)',
              border:     '1px solid var(--toggle-border)',
            }}
          >
            <User size={13} style={{ color: 'var(--primary)' }} />
          </div>
          <span>Merchant Profile</span>
        </Link>
      </div>
    </aside>
  );
}
