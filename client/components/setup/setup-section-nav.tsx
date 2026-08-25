'use client';

import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronRight, ArrowUpRight, Check,
  ShoppingBag, Layers, Briefcase, Globe, Building2,
  LayoutGrid, Bot, CheckCircle2, Circle, BarChart2,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSetupProgress, type SetupStepId } from '@/hooks/use-setup-progress';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SetupArchetype = 'ecommerce' | 'saas' | 'agency' | 'portfolio' | 'general';

// ─── Archetype definitions ─────────────────────────────────────────────────────

export const ARCHETYPES = [
  {
    id:        'ecommerce' as SetupArchetype,
    label:     'E-Commerce Store',
    category:  'Retail',
    Icon:      ShoppingBag,
    iconClass: 'text-primary',
  },
  {
    id:        'saas' as SetupArchetype,
    label:     'SaaS Product',
    category:  'Software',
    Icon:      Layers,
    iconClass: 'text-[color:var(--ora-info)]',
  },
  {
    id:        'agency' as SetupArchetype,
    label:     'Agency & Services',
    category:  'Services',
    Icon:      Briefcase,
    iconClass: 'text-[color:var(--ora-warning)]',
  },
  {
    id:        'portfolio' as SetupArchetype,
    label:     'Creator & Portfolio',
    category:  'Personal',
    Icon:      Globe,
    iconClass: 'text-[color:var(--ora-success)]',
  },
  {
    id:        'general' as SetupArchetype,
    label:     'Enterprise & FAQ',
    category:  'Enterprise',
    Icon:      Building2,
    iconClass: 'text-muted-foreground',
  },
] as const;

// Config steps — same for ALL archetypes
const CONFIG_STEPS: { step: SetupStepId; label: string }[] = [
  { step: 'persona',     label: 'Persona & voice'   },
  { step: 'integration', label: 'Widget embed'       },
  { step: 'knowledge',   label: 'Store knowledge'    },
  { step: 'voice_test',  label: 'Live voice test'    },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SetupSectionNavProps {
  activeArchetype: SetupArchetype | null;
  activeStep: SetupStepId | null; // null = show intro/hub
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SetupSectionNav({ activeArchetype, activeStep }: SetupSectionNavProps) {
  const router                                  = useRouter();
  const { progress, completedCount, totalSteps } = useSetupProgress();
  const [dropdownOpen, setDropdownOpen]         = useState(false);
  const [configExpanded, setConfigExpanded]     = useState(true);
  const dropdownRef                             = useRef<HTMLDivElement>(null);

  const progressPercent = Math.round((completedCount / totalSteps) * 100);
  const currentArch     = ARCHETYPES.find((a) => a.id === activeArchetype) ?? null;

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

  const handleArchetypeSelect = (arch: SetupArchetype | null) => {
    setDropdownOpen(false);
    if (arch === null) router.push('/setup');
    else router.push(`/setup?archetype=${arch}`);   // lands on intro page (no step)
  };

  const handleStepClick = (step: SetupStepId) => {
    if (activeArchetype) router.push(`/setup?archetype=${activeArchetype}&step=${step}`);
    else router.push(`/setup?step=${step}`);
  };

  return (
    <aside className="w-[200px] flex-shrink-0 h-full flex flex-col bg-surface-lowest border-r border-border overflow-hidden">

      {/* ── Section title ── */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
        <div className="w-5 h-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
          <Bot size={11} className="text-primary-foreground" />
        </div>
        <p className="text-[14px] font-bold text-foreground tracking-tight select-none">Get Set Up</p>
      </div>

      {/* ── Archetype dropdown ── */}
      <div className="px-3 pt-3 pb-1 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-surface-container transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentArch
              ? <currentArch.Icon size={13} className={cn(currentArch.iconClass, 'flex-shrink-0')} />
              : <LayoutGrid size={13} className="text-muted-foreground flex-shrink-0" />
            }
            <span className="text-[12.5px] font-semibold text-foreground truncate">
              {currentArch ? currentArch.label : 'All store types'}
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
            <button
              onClick={() => handleArchetypeSelect(null)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-medium hover:bg-surface-high transition-colors',
                activeArchetype === null ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <LayoutGrid size={12} className="flex-shrink-0 text-muted-foreground" />
              <span className="flex-1">All store types</span>
              {activeArchetype === null && <Check size={10} className="text-primary flex-shrink-0" />}
            </button>
            {ARCHETYPES.map((arch) => (
              <button
                key={arch.id}
                onClick={() => handleArchetypeSelect(arch.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-medium hover:bg-surface-high transition-colors',
                  activeArchetype === arch.id ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <arch.Icon size={12} className={cn(arch.iconClass, 'flex-shrink-0')} />
                <span className="flex-1 truncate">{arch.label}</span>
                {activeArchetype === arch.id && <Check size={10} className="text-primary flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto no-scrollbar flex flex-col gap-0.5">

        {activeArchetype === null ? (
          /* ── All store types: simple nav ── */
          <>
            {CONFIG_STEPS.map(({ step, label }) => (
              <button
                key={step}
                onClick={() => handleStepClick(step)}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium transition-colors',
                  activeStep === step
                    ? 'text-foreground bg-surface-container'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-container',
                )}
              >
                {label}
                <ChevronRight size={11} className="opacity-30" />
              </button>
            ))}
          </>
        ) : (
          /* ── Archetype selected: Get started + Configure steps ── */
          <>
            {/* Get started — intro page link */}
            <button
              onClick={() => router.push(`/setup?archetype=${activeArchetype}`)}
              className={cn(
                'w-full flex items-center px-2 py-1.5 rounded-md text-[12.5px] font-medium transition-colors',
                activeStep === null
                  ? 'text-foreground font-semibold bg-surface-container'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-container',
              )}
            >
              Get started
            </button>

            {/* Configure — expandable */}
            <div className="mt-0.5">
              <button
                onClick={() => setConfigExpanded((e) => !e)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-foreground hover:bg-surface-container transition-colors"
              >
                <span>Configure</span>
                <ChevronDown
                  size={11}
                  className={cn('text-muted-foreground transition-transform duration-150', configExpanded && 'rotate-180')}
                />
              </button>

              {configExpanded && (
                <div className="mt-0.5 ml-2 pl-2.5 border-l border-border/30 flex flex-col gap-0.5">
                  {CONFIG_STEPS.map(({ step, label }) => {
                    const isActive = activeStep === step;
                    const isDone   = progress[step];
                    return (
                      <button
                        key={step}
                        onClick={() => handleStepClick(step)}
                        className={cn(
                          'w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-[12px] text-left transition-colors',
                          isActive
                            ? 'text-foreground font-semibold bg-surface-container'
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface-container/60',
                        )}
                      >
                        {isDone
                          ? <CheckCircle2 size={11} className="text-primary flex-shrink-0" />
                          : <Circle size={11} className={cn('flex-shrink-0', isActive ? 'text-muted-foreground/50' : 'text-muted-foreground/25')} />
                        }
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deploy → */}
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart2 size={12} className="text-muted-foreground/40" />
                <span>Overview</span>
              </div>
              <ChevronRight size={11} className="opacity-30" />
            </button>

            {/* Agent ↗ */}
            <button
              onClick={() => router.push('/agent')}
              className="flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bot size={12} className="text-muted-foreground/40" />
                <span>Agent</span>
              </div>
              <ArrowUpRight size={11} className="opacity-30" />
            </button>
          </>
        )}

        {/* Divider + progress */}
        <div className="h-px bg-border mx-1 my-1.5" />
        <div className="px-2 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Progress</span>
            <span className="text-[11px] font-semibold text-foreground tabular-nums">
              {completedCount}/{totalSteps}
            </span>
          </div>
          <div className="h-1 rounded-full bg-surface-bright overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-[10.5px] text-muted-foreground/60 mt-1.5 leading-tight">
            {completedCount === totalSteps
              ? 'All steps complete ✓'
              : `${totalSteps - completedCount} step${totalSteps - completedCount !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
      </nav>
    </aside>
  );
}
