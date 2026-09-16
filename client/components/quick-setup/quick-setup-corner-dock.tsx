'use client';

import React, { useState } from 'react';
import { ArrowRight, Minus } from 'lucide-react';
import { useQuickSetup } from '@/hooks/use-quick-setup';

export function QuickSetupCornerDock() {
  const {
    isOpen,
    isAllCompleted,
    completedCount,
    totalSteps,
    progressPercent,
    openModal,
  } = useQuickSetup();

  const [minimized, setMinimized] = useState(false);

  if (isAllCompleted || isOpen) return null;

  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        aria-label={`Resume store setup — ${completedCount} of ${totalSteps} steps complete`}
        className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full border border-border/80 bg-surface-lowest/95 backdrop-blur-sm shadow-xl flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-2 focus-visible:outline-ring"
      >
        <svg className="w-10 h-10 transform -rotate-90 absolute" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r={radius} stroke="currentColor" strokeWidth="2" fill="transparent" className="text-surface-bright" />
          <circle
            cx="14" cy="14" r={radius}
            stroke="currentColor" strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="text-primary transition-all duration-500"
          />
        </svg>
        <span className="relative text-[9px] font-bold text-foreground tabular-nums">{progressPercent}%</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-40 flex items-center gap-3 px-3.5 py-2.5 rounded-full border border-border/70 bg-surface-lowest/95 backdrop-blur-sm shadow-xl animate-in slide-in-from-bottom-2 duration-200"
      aria-label="Store setup progress"
    >
      {/* Progress ring */}
      <div className="relative w-7 h-7 flex items-center justify-center flex-shrink-0">
        <svg className="w-7 h-7 transform -rotate-90 absolute" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r={radius} stroke="currentColor" strokeWidth="2" fill="transparent" className="text-surface-bright" />
          <circle
            cx="14" cy="14" r={radius}
            stroke="currentColor" strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="text-primary transition-all duration-500"
          />
        </svg>
        <span className="relative text-[8.5px] font-bold text-foreground tabular-nums">{progressPercent}%</span>
      </div>

      {/* Label */}
      <div>
        <p className="text-xs font-semibold text-foreground leading-none">Set up ORA</p>
        <p className="text-[10.5px] text-muted-foreground tabular-nums mt-0.5">
          {completedCount} / {totalSteps} done
        </p>
      </div>

      {/* Resume */}
      <button
        type="button"
        onClick={() => openModal()}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer"
      >
        Resume
        <ArrowRight size={11} />
      </button>

      {/* Minimize */}
      <button
        type="button"
        onClick={() => setMinimized(true)}
        aria-label="Minimize"
        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
      >
        <Minus size={11} />
      </button>
    </div>
  );
}
