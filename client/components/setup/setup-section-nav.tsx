'use client';

import {
  ChevronDown, ChevronRight, ArrowUpRight, Check,
  LayoutGrid, SlidersHorizontal, CheckCircle2, Circle, BarChart2,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSetupProgress, type SetupStepId } from '@/hooks/use-setup-progress';
import { useAppRouter } from '@/lib/navigation/app-path';
import { ARCHETYPES, type BusinessArchetype } from '@/lib/archetypes';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The setup guide used to carry its own five-value archetype list whose ids
 * drifted from the server enum. It now renders the shared list; the alias is
 * kept so the guide's own prop names still read as setup concerns.
 */
export type SetupArchetype = BusinessArchetype;

export { ARCHETYPES };

// Config steps — same for ALL archetypes
const CONFIG_STEPS: { step: SetupStepId; label: string }[] = [
  { step: 'persona',     label: 'Persona & voice'   },
  { step: 'integration', label: 'Widget embed'       },
  { step: 'knowledge',   label: 'Store knowledge'    },
  { step: 'voice_test',  label: 'Test ORA live'      },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SetupSectionNavProps {
  activeArchetype: SetupArchetype | null;
  activeStep: SetupStepId | null; // null = show intro/hub
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SetupSectionNav({ activeArchetype, activeStep }: SetupSectionNavProps) {
  const router                                  = useAppRouter();
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
    <aside className="w-[210px] flex-shrink-0 h-full flex flex-col bg-surface-lowest border-r border-border overflow-hidden">

      {/* ── Section title ── */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 shadow-sm">
          <SlidersHorizontal size={13} className="text-foreground" />
        </div>
        <p className="text-[14.5px] font-bold text-foreground tracking-tight select-none">Get Set Up</p>
      </div>

      {/* ── Archetype dropdown ── */}
      <div className="px-3 pt-3 pb-1 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-container transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 shadow-sm">
              {currentArch
                ? <currentArch.Icon size={15} className="text-foreground" />
                : <LayoutGrid size={15} className="text-foreground" />
              }
            </div>
            <span className="text-[14px] font-semibold text-foreground truncate">
              {currentArch ? currentArch.label : 'All store types'}
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
            <button
              onClick={() => handleArchetypeSelect(null)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[14px] font-medium hover:bg-surface-high transition-colors',
                activeArchetype === null ? 'text-foreground font-semibold bg-surface-high/60' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 shadow-sm">
                <LayoutGrid size={15} className="text-foreground" />
              </div>
              <span className="flex-1 truncate">All store types</span>
              {activeArchetype === null && <Check size={13} className="text-foreground flex-shrink-0" />}
            </button>
            {ARCHETYPES.map((arch) => (
              <button
                key={arch.id}
                onClick={() => handleArchetypeSelect(arch.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[14px] font-medium hover:bg-surface-high transition-colors',
                  activeArchetype === arch.id ? 'text-foreground font-semibold bg-surface-high/60' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 shadow-sm">
                  <arch.Icon size={15} className="text-foreground" />
                </div>
                <span className="flex-1 truncate">{arch.label}</span>
                {activeArchetype === arch.id && <Check size={13} className="text-foreground flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2.5 overflow-y-auto no-scrollbar flex flex-col gap-1">

        {activeArchetype === null ? (
          /* ── All store types: simple nav ── */
          <>
            {CONFIG_STEPS.map(({ step, label }) => (
              <button
                key={step}
                onClick={() => handleStepClick(step)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium transition-colors',
                  activeStep === step
                    ? 'text-foreground bg-surface-container font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-container',
                )}
              >
                {label}
                <ChevronRight size={12} className="opacity-40" />
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
                'w-full flex items-center px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors text-left',
                activeStep === null
                  ? 'text-foreground font-semibold bg-surface-high shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
              )}
            >
              <span>Get started</span>
            </button>

            {/* Configure — expandable */}
            <div>
              <button
                onClick={() => setConfigExpanded((e) => !e)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium text-foreground hover:bg-surface-high/60 transition-colors"
              >
                <span>Configure</span>
                <ChevronDown
                  size={12}
                  className={cn('text-muted-foreground transition-transform duration-150', configExpanded && 'rotate-180')}
                />
              </button>

              {configExpanded && (
                <div className="mt-0.5 ml-2 pl-2.5 border-l border-border/60 flex flex-col gap-0.5">
                  {CONFIG_STEPS.map(({ step, label }) => {
                    const isActive = activeStep === step;
                    const isDone   = progress[step];
                    return (
                      <button
                        key={step}
                        onClick={() => handleStepClick(step)}
                        className={cn(
                          'w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[13px] text-left transition-colors',
                          isActive
                            ? 'text-foreground font-semibold bg-surface-high shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
                        )}
                      >
                        {isDone
                          ? <CheckCircle2 size={12} className="text-foreground flex-shrink-0" />
                          : <Circle size={12} className={cn('flex-shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground/30')} />
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
              className="flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart2 size={13} className="text-muted-foreground/40" />
                <span>Overview</span>
              </div>
              <ChevronRight size={12} className="opacity-40" />
            </button>

            {/* Agent ↗ */}
            <button
              onClick={() => router.push('/agent')}
              className="flex items-center justify-between px-2.5 py-2 rounded-md text-[13.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-muted-foreground/40" />
                <span>Agent</span>
              </div>
              <ArrowUpRight size={12} className="opacity-40" />
            </button>
          </>
        )}

        {/* Divider + progress */}
        <div className="h-px bg-border mx-1 my-2" />
        <div className="px-2 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Progress</span>
            <span className="text-[11px] font-semibold text-foreground tabular-nums">
              {completedCount}/{totalSteps}
            </span>
          </div>
          <div className="h-1 rounded-full bg-surface-bright overflow-hidden">
            <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${progressPercent}%` }} />
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
