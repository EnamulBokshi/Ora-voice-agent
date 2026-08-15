'use client';

import Link from 'next/link';
import { Radio, ArrowRight, CheckCircle2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

interface HeroStatusCardProps {
  activeConversations?: number;
  voiceSessions?: number;
  productsCount?: number;
}

export function HeroStatusCard({
  activeConversations = 0,
  voiceSessions = 0,
  productsCount = 0,
}: HeroStatusCardProps) {
  return (
    <section
      aria-label="Store Live Status"
      className="relative overflow-hidden rounded-md border border-border bg-surface-container p-6 lg:p-7 transition-all hover:border-border/80"
    >
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Headline & Stat Summary */}
        <div className="space-y-3 max-w-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--status-online)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] animate-pulse" />
                Live on your storefront
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-snug">
              Engaging shoppers & driving sales
            </h2>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
              Handling shopper queries, checking product availability, and guiding customers to checkout in real time.
            </p>
          </div>

          {/* Stat Chips */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-md bg-surface-low border border-border/70 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active Chats
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums mt-0.5 flex items-center gap-1.5">
                {activeConversations}
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] animate-pulse" />
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-low border border-border/70 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Voice Calls
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums mt-0.5 flex items-center gap-1.5">
                {voiceSessions}
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </span>
            </div>

            <div className="p-3 rounded-md bg-surface-low border border-border/70 flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Catalog Items
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums mt-0.5 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-[color:var(--status-online)]" />
                {productsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Right: CTA to Live Desk */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-center gap-2.5 flex-shrink-0">
          <Link
            href="/live-desk"
            className={buttonVariants({
              variant: 'default',
              size: 'default',
              className: 'gap-2 font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm text-[13px] px-5 py-2.5',
            })}
          >
            <Radio size={14} className="animate-pulse" />
            Open Live Desk
            <ArrowRight size={14} />
          </Link>

          <Link
            href="/agent"
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-1"
          >
            Manage store settings
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </section>
  );
}
