'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavSubItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface NavItemDef {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  subItems?: NavSubItem[];
  badge?: React.ReactNode;
}

export interface NavGroupDef {
  groupLabel: string;
  items: NavItemDef[];
}

// ─── NavLink — Single Standard Row or Collapsible Parent ──────────────────────

interface NavLinkProps {
  item: NavItemDef;
  isActive: boolean;
  activeSubId?: string | null;
  isParentExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function NavLink({
  item,
  isActive,
  activeSubId,
  isParentExpanded = false,
  onToggleExpand,
}: NavLinkProps) {
  const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);

  if (!hasSubItems) {
    return (
      <Link
        href={item.href}
        className={cn(
          'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-surface-high text-foreground border-l-2 border-primary pl-[calc(0.75rem-2px)] font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60 border-l-2 border-transparent pl-[calc(0.75rem-2px)]',
        )}
      >
        <span
          className={cn(
            'flex-shrink-0 transition-colors',
            isActive ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground',
          )}
        >
          {item.icon}
        </span>
        <span className="truncate flex-1">{item.label}</span>
        {item.badge && <span className="flex-shrink-0">{item.badge}</span>}
      </Link>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Parent Row */}
      <div
        className={cn(
          'group flex items-center justify-between rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)] pr-1.5',
          isActive && !activeSubId
            ? 'bg-surface-high text-foreground border-primary font-semibold'
            : isActive
            ? 'text-foreground border-border/70 bg-surface-high/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
        )}
      >
        <Link
          href={item.href}
          className="flex items-center gap-3 py-2 flex-1 min-w-0"
        >
          <span
            className={cn(
              'flex-shrink-0 transition-colors',
              isActive ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground',
            )}
          >
            {item.icon}
          </span>
          <span className="truncate flex-1">{item.label}</span>
        </Link>

        <div className="flex items-center gap-1">
          {item.badge && <span className="flex-shrink-0 mr-1">{item.badge}</span>}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleExpand) onToggleExpand();
            }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
            aria-label={isParentExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isParentExpanded ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Sub-Items */}
      {isParentExpanded && item.subItems && (
        <div className="flex flex-col gap-0.5 mt-0.5 ml-4 pl-3 border-l border-border/40 py-1 space-y-0.5 animate-in fade-in duration-150">
          {item.subItems.map((sub) => {
            const isSubActive = activeSubId === sub.id;
            return (
              <Link
                key={sub.id}
                href={sub.href}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors min-w-0',
                  isSubActive
                    ? 'text-foreground bg-surface-high font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                )}
              >
                {sub.icon && (
                  <span className={cn('flex-shrink-0', isSubActive ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground')}>
                    {sub.icon}
                  </span>
                )}
                <span className="truncate flex-1">{sub.label}</span>
                {isSubActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-[#C8F031] flex-shrink-0 ml-auto" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
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
        'w-9 h-9 rounded-md flex items-center justify-center transition-colors mx-auto relative',
        isActive
          ? 'bg-surface-high text-foreground dark:text-[#C8F031]'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
      )}
    >
      {item.icon}
      {item.badge && (
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-surface-highest text-foreground dark:text-[#C8F031] text-[9px] font-mono font-bold flex items-center justify-center border border-border">
          •
        </span>
      )}
    </Link>
  );
}
