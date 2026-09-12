'use client';

import React from 'react';
import { Check, ExternalLink, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLink } from '@/components/navigation/app-link';

// ─── Types ────────────────────────────────────────────────────────────────────
// Note: isOpen / onToggleOpen removed — steps are always expanded (Intercom pattern).
// The accordion has been replaced by scrollable, always-visible rows.

export interface SetupStepCardProps {
  id: string;
  stepNumber: number;
  stepLabel: string;       // e.g. "PERSONA", "EMBED", "KNOWLEDGE", "VOICE TEST"
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  learnMoreHref?: string;
  learnMoreText?: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  previewComponent: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────
// Layout: preview LEFT (flex-1) | step info RIGHT (fixed 280px)
// Matches Intercom's "How it works" numbered row pattern.
// No card wrapper — steps are always visible as scrollable editorial rows.

export function SetupStepCard({
  id,
  stepNumber,
  stepLabel,
  title,
  description,
  ctaText,
  ctaHref,
  onCtaClick,
  learnMoreHref,
  learnMoreText,
  isCompleted,
  onToggleComplete,
  previewComponent,
}: SetupStepCardProps) {
  return (
    <div
      id={`step-${id}`}
      className="flex flex-col lg:flex-row gap-8 lg:gap-12 py-10 border-b border-border/30 last:border-b-0 scroll-mt-4"
    >
      {/* ── Left: preview — sits naturally, no wrapper box ── */}
      <div className="flex-1 min-w-0 order-2 lg:order-1">
        {previewComponent}
      </div>

      {/* ── Right: step info column ── */}
      <div className="w-full lg:w-[280px] flex-shrink-0 order-1 lg:order-2">
        {/* Step label — "1. PERSONA" */}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {stepNumber}. {stepLabel}
        </p>

        {/* Completion toggle + title */}
        <div className="flex items-start gap-3 mb-2">
          <button
            type="button"
            onClick={onToggleComplete}
            title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
            className={cn(
              'mt-0.5 w-[18px] h-[18px] flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer',
              isCompleted
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border/60 bg-transparent hover:border-primary/60',
            )}
          >
            <Check size={9} strokeWidth={3} className={cn(isCompleted ? 'opacity-100' : 'opacity-0')} />
          </button>
          <h3
            className={cn(
              'text-[17px] font-bold leading-snug tracking-tight',
              isCompleted ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {title}
          </h3>
        </div>

        {/* Done badge */}
        {isCompleted && (
          <span className="inline-flex items-center text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded-full bg-primary/10 ml-[30px] mb-1">
            Done
          </span>
        )}

        {/* Description */}
        <p className="text-[12.5px] text-muted-foreground leading-relaxed ml-[30px] mt-1 mb-5">
          {description}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-2 ml-[30px]">
          {ctaText && (
            ctaHref ? (
              <AppLink
                href={ctaHref}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11.5px] font-semibold hover:bg-primary-hover transition-colors"
              >
                {ctaText} <ArrowRight size={10} />
              </AppLink>
            ) : (
              <button
                type="button"
                onClick={onCtaClick}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11.5px] font-semibold hover:bg-primary-hover transition-colors cursor-pointer"
              >
                {ctaText} <ArrowRight size={10} />
              </button>
            )
          )}
          {learnMoreHref && (
            <AppLink
              href={learnMoreHref}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border/60 text-[11.5px] text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              {learnMoreText || 'Open workspace'} <ExternalLink size={9} />
            </AppLink>
          )}
        </div>
      </div>
    </div>
  );
}
