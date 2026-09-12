'use client';

import {
  ChevronDown, ChevronRight, ArrowUpRight,
  Mic, FileText, Package, Rocket, BarChart2,
  Settings, GitBranch, Bot, LayoutGrid, Check,
  Terminal,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AppLink } from '@/components/navigation/app-link';
import { useAppRouter } from '@/lib/navigation/app-path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentRole = 'prompt' | 'voice' | 'documents' | 'products';
export type AgentView = 'get-started' | 'feed' | 'knowledge' | 'catalog' | 'prompt';

// ─── Role definitions ─────────────────────────────────────────────────────────

export const ROLES = [
  { id: 'prompt'    as AgentRole, label: 'System Prompt & Persona', Icon: Terminal, iconClass: 'text-foreground' },
  { id: 'voice'     as AgentRole, label: 'Talk to ORA',            Icon: Mic,      iconClass: 'text-foreground' },
  { id: 'documents' as AgentRole, label: 'Documents',               Icon: FileText, iconClass: 'text-foreground' },
  { id: 'products'  as AgentRole, label: 'Product Catalog',         Icon: Package,  iconClass: 'text-foreground' },
];

// Sub-items shown under ▾ Train when a role is active
export const TRAIN_ITEMS: Record<AgentRole, { view: AgentView; label: string }[]> = {
  prompt: [
    { view: 'prompt', label: 'System prompt' },
  ],
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
  // Pushes resolve for the tree this renders in, so the embedded app stays
  // inside /shopify instead of bouncing the iframe to the web sign-in page.
  const router = useAppRouter();
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

  const handleRoleSelect = (role: AgentRole | null) => {
    setDropdownOpen(false);
    if (role === null) {
      router.push('/agent');
    } else if (role === 'prompt') {
      router.push('/agent?role=prompt');
    } else {
      router.push(`/agent?role=${role}&view=get-started`);
    }
  };

  const currentRole = ROLES.find((r) => r.id === activeRole) ?? null;

  return (
    <aside className="w-[210px] flex-shrink-0 h-full flex flex-col bg-surface-lowest border-r border-border overflow-hidden">

      {/* ── Section title ── */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 shadow-sm">
          <Bot size={13} className="text-foreground" />
        </div>
        <p className="text-[14.5px] font-bold text-foreground tracking-tight select-none">ORA Agent</p>
      </div>

      {/* ── Role dropdown ── */}
      <div className="px-3 pt-3 pb-1 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-container transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 shadow-sm">
              {currentRole
                ? <currentRole.Icon size={15} className="text-foreground" />
                : <LayoutGrid size={15} className="text-foreground" />
              }
            </div>
            <span className="text-[14px] font-semibold text-foreground truncate">
              {currentRole ? currentRole.label : 'All roles'}
            </span>
          </div>
          <ChevronDown
            size={13}
            className={cn('text-muted-foreground flex-shrink-0 transition-transform duration-150', dropdownOpen && 'rotate-180')}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-50 bg-surface-container rounded-xl border border-border/60 overflow-hidden shadow-2xl shadow-black/50 p-1">
            {/* All roles */}
            <button
              onClick={() => handleRoleSelect(null)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[14px] font-medium hover:bg-surface-high transition-colors',
                activeRole === null ? 'text-foreground font-semibold bg-surface-high/60' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 shadow-sm">
                <LayoutGrid size={15} className="text-foreground" />
              </div>
              <span className="flex-1 truncate">All roles</span>
              {activeRole === null && <Check size={13} className="text-foreground flex-shrink-0" />}
            </button>
            {/* Role options */}
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[14px] font-medium hover:bg-surface-high transition-colors',
                  activeRole === role.id ? 'text-foreground font-semibold bg-surface-high/60' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 shadow-sm">
                  <role.Icon size={15} className="text-foreground" />
                </div>
                <span className="flex-1 truncate">{role.label}</span>
                {activeRole === role.id && <Check size={13} className="text-foreground flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2.5 overflow-y-auto no-scrollbar flex flex-col gap-1">

        {activeRole === null ? (
          /* ── All roles: simple top-level nav ── */
          <>
            {[
              { label: 'Train',   href: '/agent?role=voice' },
              { label: 'Test',    href: '/agent?role=voice&view=feed' },
              { label: 'Deploy',  href: '/setup' },
              { label: 'Analyze', href: '/conversations' },
            ].map((item) => (
              <AppLink
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
              >
                {item.label}
                <ChevronRight size={12} className="opacity-40" />
              </AppLink>
            ))}
          </>
        ) : (
          /* ── Role selected: expandable Train + other items ── */
          <>
            {/* Train — expandable */}
            <div>
              <button
                onClick={() => setTrainExpanded((e) => !e)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium text-foreground hover:bg-surface-container transition-colors"
              >
                <span>Train</span>
                <ChevronDown
                  size={12}
                  className={cn('text-muted-foreground transition-transform duration-150', trainExpanded && 'rotate-180')}
                />
              </button>

              {trainExpanded && (
                <div className="mt-0.5 ml-2 pl-2.5 border-l border-border/60 flex flex-col gap-0.5">
                  {TRAIN_ITEMS[activeRole].map((item) => {
                    const isActive = activeView === item.view;
                    return (
                      <AppLink
                        key={item.view}
                        href={`/agent?role=${activeRole}&view=${item.view}`}
                        className={cn(
                          'flex items-center py-1.5 px-2.5 rounded-lg text-[13px] transition-colors',
                          isActive
                            ? 'text-foreground font-semibold bg-surface-high shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
                        )}
                      >
                        <span>{item.label}</span>
                      </AppLink>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deploy → */}
            <AppLink
              href="/setup"
              className="flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <span>Deploy</span>
              <ChevronRight size={12} className="opacity-40" />
            </AppLink>

            {/* Analyze → */}
            <AppLink
              href="/conversations"
              className="flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <span>Analyze</span>
              <ChevronRight size={12} className="opacity-40" />
            </AppLink>

            {/* Settings ↗ */}
            <AppLink
              href="/profile"
              className="flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <span>Settings</span>
              <ArrowUpRight size={12} className="opacity-40" />
            </AppLink>

            {/* Divider */}
            <div className="h-px bg-border mx-1 my-2" />

            {/* Workflows */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium text-muted-foreground/35 select-none cursor-default">
              <div className="flex items-center gap-2">
                <GitBranch size={13} />
                <span>Workflows</span>
              </div>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-surface-container text-muted-foreground/30 font-semibold tracking-wide uppercase">
                Soon
              </span>
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
