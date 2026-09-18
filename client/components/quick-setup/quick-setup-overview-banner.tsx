'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuickSetup } from '@/hooks/use-quick-setup';
import { QUICK_SETUP_STEPS } from './quick-setup-types';

const BANNER_DISMISSED_KEY = 'ora_overview_setup_banner_dismissed';

const STEP_SHORT_LABELS: Record<string, string> = {
  store_name: 'Store name',
  business_type: 'Business type',
  store_domain: 'Domain',
  business_overview: 'Overview',
  system_prompt: 'Behavior',
};

export function QuickSetupOverviewBanner() {
  const {
    isAllCompleted,
    completedCount,
    totalSteps,
    progressPercent,
    stepsState,
    openModal,
  } = useQuickSetup();

  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(BANNER_DISMISSED_KEY) === 'true');
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    }
  };

  if (isAllCompleted || dismissed) return null;

  const incompleteSteps = QUICK_SETUP_STEPS.filter((s) => !stepsState[s.id]);
  const nextStep = incompleteSteps[0];

  return (
    <div
      className="rounded-lg border border-border/80 dark:border-border/60 bg-card dark:bg-surface-lowest px-4 py-3.5 mb-6 flex flex-col gap-3 shadow-xs dark:shadow-none animate-in fade-in duration-200"
      aria-label="Store setup guide"
    >
      {/* ── Top row ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground tracking-tight">
                Finish setting up ORA
              </p>
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {completedCount}/{totalSteps}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete your store configuration so ORA sells accurately.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {nextStep && (
            <button
              type="button"
              onClick={() => openModal(nextStep.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
            >
              Continue
              <ArrowRight size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-surface-high transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="w-full h-1 bg-muted dark:bg-border/50 rounded-full overflow-hidden relative">
        <div
          className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ── Step list ── */}
      <div className="flex items-center gap-1 flex-wrap">
        {QUICK_SETUP_STEPS.map((step, idx) => {
          const isDone = stepsState[step.id];
          const isNext = step.id === nextStep?.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => openModal(step.id)}
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded transition-all cursor-pointer',
                isDone
                  ? 'text-muted-foreground/60 line-through'
                  : isNext
                  ? 'bg-primary/10 text-foreground font-medium border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-surface-high/50',
              )}
            >
              {isDone ? (
                <Check size={10} className="text-primary flex-shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-border/80 flex items-center justify-center text-[8px] font-bold text-muted-foreground flex-shrink-0">
                  {idx + 1}
                </span>
              )}
              {STEP_SHORT_LABELS[step.id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
