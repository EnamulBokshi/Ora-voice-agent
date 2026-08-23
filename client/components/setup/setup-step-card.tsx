'use client';

import React from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SetupStepCardProps {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  learnMoreHref?: string;
  learnMoreText?: string;
  isCompleted: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleComplete: () => void;
  previewComponent: React.ReactNode;
}

export function SetupStepCard({
  stepNumber,
  title,
  description,
  ctaText,
  ctaHref,
  onCtaClick,
  learnMoreHref,
  learnMoreText,
  isCompleted,
  isOpen,
  onToggleOpen,
  onToggleComplete,
  previewComponent,
}: SetupStepCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-300 overflow-hidden relative',
        isOpen
          ? 'border-primary/50 bg-surface-container/80 shadow-xl shadow-black/40 ring-1 ring-primary/25'
          : 'border-border/70 bg-surface-lowest/70 hover:border-border hover:bg-surface-lowest/95 shadow-sm',
      )}
    >
      {/* Active accent top stripe */}
      {isOpen && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      )}

      {/* ── Collapsed / Summary Row Header ── */}
      <div
        className={cn(
          'flex items-center justify-between p-4 sm:p-5.5 cursor-pointer transition-colors select-none',
          isOpen && 'border-b border-border/40 pb-4.5 bg-surface-high/20',
        )}
        onClick={onToggleOpen}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Checkbox / Completion status indicator */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete();
            }}
            title={isCompleted ? 'Mark step as incomplete' : 'Mark step as complete'}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer',
              isCompleted
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/40 ring-2 ring-primary/30'
                : 'border-2 border-muted-foreground/40 hover:border-primary text-transparent hover:text-primary/40 bg-surface-lowest',
            )}
          >
            <Check size={14} strokeWidth={3} className={isCompleted ? 'opacity-100' : 'opacity-0'} />
          </button>

          {/* Title & Step Number */}
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Step 0{stepNumber}
              </span>
              {isCompleted ? (
                <span className="text-[10px] font-mono font-bold text-primary px-2 py-0.2 rounded-full bg-primary/10 border border-primary/25">
                  ✓ Configured
                </span>
              ) : (
                <span className="text-[10px] font-mono font-medium text-muted-foreground/80 px-2 py-0.2 rounded-full bg-surface-high border border-border/60">
                  Pending
                </span>
              )}
            </div>
            <h3
              className={cn(
                'text-[15px] sm:text-[16px] font-bold tracking-tight truncate transition-colors',
                isCompleted ? 'text-foreground/90' : 'text-foreground',
              )}
            >
              {title}
            </h3>
          </div>
        </div>

        {/* Expand / Collapse Action */}
        <div className="flex items-center gap-3 flex-shrink-0 text-muted-foreground">
          <span className="text-[11.5px] font-medium hidden sm:inline-block font-mono text-muted-foreground/70">
            {isOpen ? 'Collapse' : 'Configure'}
          </span>
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center bg-surface-high/60 border border-border/50 hover:bg-surface-highest transition-all duration-200',
              isOpen && 'rotate-180 text-foreground bg-primary/15 border-primary/30 text-primary',
            )}
          >
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* ── Expanded Content ── */}
      {isOpen && (
        <div className="p-4 sm:p-6 sm:pt-5 space-y-5 animate-in fade-in duration-200">
          {/* Step description & fast action header bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border/40">
            <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-muted-foreground max-w-3xl">
              {description}
            </p>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              {ctaText && (
                <>
                  {ctaHref ? (
                    <Link
                      href={ctaHref}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-98 transition-all shadow-xs"
                    >
                      <span>{ctaText}</span>
                      <ArrowRight size={12} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={onCtaClick}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-98 transition-all shadow-xs cursor-pointer"
                    >
                      <span>{ctaText}</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </>
              )}

              {learnMoreHref && (
                <Link
                  href={learnMoreHref}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2 py-1 rounded hover:bg-surface-high"
                >
                  <span>{learnMoreText || 'Open workspace'}</span>
                  <ExternalLink size={11} />
                </Link>
              )}
            </div>
          </div>

          {/* Interactive Workspace Component */}
          <div className="w-full">{previewComponent}</div>
        </div>
      )}
    </div>
  );
}
