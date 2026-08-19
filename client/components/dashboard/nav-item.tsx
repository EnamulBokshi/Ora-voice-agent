'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavSubItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  tabKey: string;
}

export interface NavItemDef {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  subItems?: NavSubItem[];
}

export interface NavGroupDef {
  groupLabel: string;
  items: NavItemDef[];
}

// ─── NavLink — single row (expanded sidebar) ──────────────────────────────────

interface NavLinkProps {
  item: NavItemDef;
  isActive: boolean;
  collapsed?: false;
}

export function NavLink({ item, isActive }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-md text-[13.5px] font-medium transition-all duration-150',
        isActive
          ? 'bg-surface-high text-foreground border-l-2 border-primary pl-[calc(0.75rem-2px)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-high border-l-2 border-transparent pl-[calc(0.75rem-2px)]',
      )}
    >
      <span
        className={cn(
          'flex-shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )}
      >
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ─── NavSubLink — indented child row ──────────────────────────────────────────

interface NavSubLinkProps {
  sub: NavSubItem;
  isActive: boolean;
}

export function NavSubLink({ sub, isActive }: NavSubLinkProps) {
  return (
    <Link
      href={sub.href}
      className={cn(
        'flex items-center gap-2.5 pl-9 pr-3 py-1.5 text-[12.5px] font-medium transition-colors rounded-md',
        isActive
          ? 'text-foreground bg-surface-high'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
      )}
    >
      <span className={cn('flex-shrink-0', isActive ? 'text-primary' : '')}>{sub.icon}</span>
      <span className="truncate">{sub.label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      )}
    </Link>
  );
}

// ─── NavIconButton — collapsed mode ───────────────────────────────────────────

interface NavIconButtonProps {
  item: NavItemDef;
  isActive: boolean;
}

export function NavIconButton({ item, isActive }: NavIconButtonProps) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      title={item.label}
      className={cn(
        'w-9 h-9 rounded-md flex items-center justify-center transition-colors mx-auto',
        isActive
          ? 'bg-surface-high text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
      )}
    >
      {item.icon}
    </Link>
  );
}
