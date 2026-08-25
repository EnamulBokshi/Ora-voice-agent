'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronRight, ArrowUpRight,
  Mic, FileText, Package, Rocket, BarChart2,
  Settings, GitBranch, Bot, LayoutGrid, Check,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentRole = 'voice' | 'documents' | 'products';
export type AgentView = 'get-started' | 'feed' | 'knowledge' | 'catalog';

// ─── Role definitions ─────────────────────────────────────────────────────────

const ROLES = [
  { id: 'voice'     as AgentRole, label: 'Talk to ORA',    Icon: Mic,      iconClass: 'text-primary' },
  { id: 'documents' as AgentRole, label: 'Documents',       Icon: FileText, iconClass: 'text-[color:var(--ora-info)]' },
  { id: 'products'  as AgentRole, label: 'Product Catalog', Icon: Package,  iconClass: 'text-[color:var(--ora-warning)]' },
];

// Sub-items shown under ▾ Train when a role is active
const TRAIN_ITEMS: Record<AgentRole, { view: AgentView; label: string }[]> = {
  voice:     [
    { view: 'get-started', label: 'Get started' },
    { view: 'feed',        label: 'Voice feed'  },
    { view: 'knowledge',   label: 'Knowledge'   },
  ],
  documents: [
    { view: 'get-started', label: 'Get started'  },
    { view: 'feed',        label: 'Upload files' },
    { view: 'knowledge',   label: 'Knowledge base' },
  ],
  products:  [
    { view: 'get-started', label: 'Get started'  },
    { view: 'catalog',     label: 'Sync catalog' },
  ],
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AgentSectionNavProps {
  activeRole: AgentRole | null;
  activeView: AgentView;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentSectionNav({ activeRole, activeView }: AgentSectionNavProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [trainExpanded, setTrainExpanded]   = useState(true);
  const dropdownRef                         = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentRole = ROLES.find((r) => r.id === activeRole) ?? null;

  const handleRoleSelect = (role: AgentRole | null) => {
    setDropdownOpen(false);
    if (role === null) router.push('/agent');
    else router.push(`/agent?role=${role}`);
  };

  return (
    <aside className="w-[200px] flex-shrink-0 h-full flex flex-col bg-surface-lowest border-r border-border overflow-hidden">

      {/* ── Section title ── */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
        <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
          <Bot size={11} className="text-primary-foreground" />
        </div>
        <p className="text-[14px] font-bold text-foreground tracking-tight select-none">ORA Agent</p>
      </div>

      {/* ── Role dropdown ── */}
      <div className="px-3 pt-3 pb-1 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-surface-container transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentRole
              ? <currentRole.Icon size={13} className={cn(currentRole.iconClass, 'flex-shrink-0')} />
              : <LayoutGrid size={13} className="text-muted-foreground flex-shrink-0" />
            }
            <span className="text-[12.5px] font-semibold text-foreground truncate">
              {currentRole ? currentRole.label : 'All roles'}
            </span>
          </div>
          <ChevronDown
            size={12}
            className={cn('text-muted-foreground flex-shrink-0 transition-transform duration-150', dropdownOpen && 'rotate-180')}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-50 bg-surface-container rounded-lg border border-border/50 overflow-hidden shadow-2xl shadow-black/40">
            {/* All roles */}
            <button
              onClick={() => handleRoleSelect(null)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-medium hover:bg-surface-high transition-colors',
                activeRole === null ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <LayoutGrid size={12} className="flex-shrink-0 text-muted-foreground" />
              <span className="flex-1">All roles</span>
              {activeRole === null && <Check size={10} className="text-primary flex-shrink-0" />}
            </button>
            {/* Role options */}
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-medium hover:bg-surface-high transition-colors',
                  activeRole === role.id ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <role.Icon size={12} className={cn(role.iconClass, 'flex-shrink-0')} />
                <span className="flex-1 truncate">{role.label}</span>
                {activeRole === role.id && <Check size={10} className="text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto no-scrollbar flex flex-col gap-0.5">

        {activeRole === null ? (
          /* ── All roles: simple top-level nav ── */
          <>
            {[
              { label: 'Train',   href: '/agent?role=voice' },
              { label: 'Test',    href: '/agent?role=voice&view=feed' },
              { label: 'Deploy',  href: '/setup' },
              { label: 'Analyze', href: '/conversations' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
              >
                {item.label}
                <ChevronRight size={11} className="opacity-30" />
              </Link>
            ))}
          </>
        ) : (
          /* ── Role selected: expandable Train + other items ── */
          <>
            {/* Train — expandable */}
            <div>
              <button
                onClick={() => setTrainExpanded((e) => !e)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-foreground hover:bg-surface-container transition-colors"
              >
                <span>Train</span>
                <ChevronDown
                  size={11}
                  className={cn('text-muted-foreground transition-transform duration-150', trainExpanded && 'rotate-180')}
                />
              </button>

              {trainExpanded && (
                <div className="mt-0.5 ml-2 pl-2.5 border-l border-border/30 flex flex-col gap-0.5">
                  {TRAIN_ITEMS[activeRole].map((item) => (
                    <Link
                      key={item.view}
                      href={`/agent?role=${activeRole}&view=${item.view}`}
                      className={cn(
                        'flex items-center py-1.5 px-2 rounded-md text-[12px] transition-colors',
                        activeView === item.view
                          ? 'text-foreground font-semibold bg-surface-container'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-container/60',
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Deploy → */}
            <Link
              href="/setup"
              className="flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <span>Deploy</span>
              <ChevronRight size={11} className="opacity-30" />
            </Link>

            {/* Analyze → */}
            <Link
              href="/conversations"
              className="flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <span>Analyze</span>
              <ChevronRight size={11} className="opacity-30" />
            </Link>

            {/* Settings ↗ */}
            <Link
              href="/profile"
              className="flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <span>Settings</span>
              <ArrowUpRight size={11} className="opacity-30" />
            </Link>

            {/* Divider */}
            <div className="h-px bg-border mx-1 my-1.5" />

            {/* Workflows */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground/35 select-none cursor-default">
              <div className="flex items-center gap-2">
                <GitBranch size={12} />
                <span>Workflows</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container text-muted-foreground/30 font-semibold tracking-wide uppercase">
                Soon
              </span>
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
