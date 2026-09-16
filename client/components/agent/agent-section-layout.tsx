'use client';

import Image from 'next/image';
import { ReactNode } from 'react';

interface AgentSectionLayoutProps {
  iconNode: ReactNode;
  title: string;
  description: string;
  ctaNodes?: ReactNode;
  /**
   * Optional: a section with no artwork of its own renders the header without
   * the graphic rather than pointing at an image that does not exist.
   */
  previewSrc?: string;
  previewAlt?: string;
  howLabel?: string;
  children: ReactNode;
}

export function AgentSectionLayout({
  iconNode,
  title,
  description,
  ctaNodes,
  previewSrc,
  previewAlt,
  howLabel,
  children,
}: AgentSectionLayoutProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* ── Editorial header — matching Intercom & ORA universal style ── */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-4 border-b border-border/40 bg-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

          {/* Left: Text & Actions */}
          <div className="flex-1 min-w-0">
            {/* Header row: Icon + Editorial Serif Title */}
            <div className="flex items-center gap-2.5 sm:gap-3 mb-1.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
                {iconNode}
              </div>
              <h1 className="text-[22px] sm:text-[26px] font-semibold text-foreground tracking-tight leading-[1.2]">
                {title}
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-xl mb-3">
              {description}
            </p>

            {/* CTAs */}
            {ctaNodes && (
              <div className="flex items-center gap-2.5">{ctaNodes}</div>
            )}
          </div>

          {/* Right: High-End Preview Graphic */}
          {previewSrc && (
            <div className="relative w-full sm:w-[220px] h-[130px] flex-shrink-0 rounded-md overflow-hidden border border-border/50 bg-surface-container/30 shadow-xs">
              <Image
                src={previewSrc}
                alt={previewAlt ?? ''}
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, 220px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* ── Section eyebrow bar (optional) ── */}
      {howLabel && (
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 flex-shrink-0 border-b border-border/20 bg-surface-lowest/20">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {howLabel}
          </p>
        </div>
      )}

      {/* ── Functional content ── */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
