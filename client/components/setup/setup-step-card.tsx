'use client';

import React from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  ExternalLink,
  ArrowRight,
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
    <div className={cn('border-b border-border/60 transition-colors relative', isOpen && 'border-border')}>
      {/* Left primary indicator — only visible on the open step */}
      {isOpen && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary" />}
      {/* ── Header row — same rhythm as SalesFunnel / AnalyticsPanel rows ── */}
      <div
        className={cn(
          'flex items-center justify-between py-4 cursor-pointer select-none group pl-4 transition-colors',
          isOpen ? 'bg-primary/[0.03]' : 'hover:bg-muted/10',
        )}
        onClick={onToggleOpen}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Completion circle — minimal, like a checkbox */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
            title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
            className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer border',
              isCompleted
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border bg-transparent group-hover:border-muted-foreground',
            )}
          >
            <Check size={11} strokeWidth={3} className={cn('transition-opacity', isCompleted ? 'opacity-100' : 'opacity-0')} />
          </button>

          {/* Step label + title inline */}
          <div className="min-w-0 flex items-center gap-3">
            <span className="text-[11px] font-mono font-semibold text-muted-foreground/60 flex-shrink-0 tabular-nums">
              {String(stepNumber).padStart(2, '0')}
            </span>
            <h3
              className={cn(
                'text-[13.5px] font-semibold truncate transition-colors',
                isCompleted ? 'text-muted-foreground' : isOpen ? 'text-foreground' : 'text-foreground/80',
              )}
            >
              {title}
            </h3>
            {isCompleted && (
              <span className="text-[10.5px] font-mono text-primary flex-shrink-0">Done</span>
            )}
          </div>
        </div>

        {/* Collapse toggle — right side, understated */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <span className="text-[11px] text-muted-foreground/60 hidden sm:block">
            {isOpen ? 'Collapse' : 'Configure'}
          </span>
          <ChevronDown
            size={14}
            className={cn('text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </div>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div className="pb-6 space-y-5 animate-in fade-in duration-150 pl-4">
          {/* Description + action inline */}
          <div className="flex flex-col md:flex-row md:items-start gap-4 pl-9">
            <p className="text-[13px] leading-relaxed text-muted-foreground flex-1 max-w-2xl">
              {description}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {ctaText && (
                ctaHref ? (
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    {ctaText}
                    <ArrowRight size={11} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onCtaClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    {ctaText}
                    <ArrowRight size={11} />
                  </button>
                )
              )}
              {learnMoreHref && (
                <Link
                  href={learnMoreHref}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  {learnMoreText || 'Open workspace'}
                  <ExternalLink size={10} />
                </Link>
              )}
            </div>
          </div>

          {/* Preview panel — indented to align with title */}
          <div className="pl-9">{previewComponent}</div>
        </div>
      )}
    </div>
  );
}
