'use client';

import Image from 'next/image';
import { ReactNode } from 'react';

// ─── Component ────────────────────────────────────────────────────────────────
// Reusable wrapper that gives each agent section the Intercom editorial
// "selected role" page structure:
//   [icon + title + desc + CTAs] LEFT  |  [screenshot] RIGHT
//   ───────────────────────────────────────────────────────────
//   ■ HOW … WORKS   (section label)
//   ───────────────────────────────────────────────────────────
//   [functional tool — fills remaining height]

interface AgentSectionLayoutProps {
  iconNode: ReactNode;
  title: string;
  description: string;
  ctaNodes?: ReactNode;
  previewSrc: string;
  previewAlt: string;
  howLabel: string;
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
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Editorial header — matches Intercom "Ecommerce selected" pattern ── */}
      <div className="flex-shrink-0 px-8 pt-7 pb-6 border-b border-border/40">
        <div className="flex items-start gap-10">

          {/* Left: text */}
          <div className="flex-1 min-w-0">
            {/* Icon row */}
            <div className="mb-3">{iconNode}</div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-snug mb-2">
              {title}
            </h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-lg mb-4">
              {description}
            </p>
            {ctaNodes && (
              <div className="flex items-center gap-2">{ctaNodes}</div>
            )}
          </div>

          {/* Right: product screenshot */}
          <div className="relative w-[240px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden bg-surface-low">
            <Image
              src={previewSrc}
              alt={previewAlt}
              fill
              className="object-cover object-top"
              sizes="240px"
            />
          </div>
        </div>
      </div>

      {/* ── Section label — "■ HOW X WORKS" ── */}
      <div className="flex items-center gap-2 px-8 py-2.5 flex-shrink-0 border-b border-border/20">
        <span className="w-[3px] h-3 rounded-full bg-primary flex-shrink-0" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {howLabel}
        </p>
      </div>

      {/* ── Functional content — fills remaining height ── */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
