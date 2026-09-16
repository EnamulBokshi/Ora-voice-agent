'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowUpRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiCardDef {
  id: string;
  label: string;
  value: string;
  href: string;
  trend?: string;
  icon?: React.ReactNode;
  tooltip?: string;
}

interface KpiStripProps {
  cards: KpiCardDef[];
}

export function KpiStrip({ cards }: KpiStripProps) {
  // The column count follows the cards actually passed in. This was hardcoded to
  // lg:grid-cols-4 with a `cards.slice(0, 4)` below it, so the fifth KPI the overview
  // defines (Catalog Items) was computed, styled, and then silently discarded.
  const columns = cards.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4';

  return (
    <div
      className={cn(
        'w-full rounded-md border border-border/50 bg-border/50 gap-px grid grid-cols-1 sm:grid-cols-2 overflow-hidden relative z-10',
        columns,
      )}
      role="region"
      aria-label="Key store performance metrics"
    >
      {cards.map((card, idx) => {
        const trendPositive = card.trend && !card.trend.startsWith('-');
        const isFifthCardOnTablet = idx === 4 && cards.length === 5;
        return (
          <Link
            key={card.id}
            href={card.href}
            id={`kpi-${card.id}`}
            className={cn(
              'group bg-background px-4 sm:px-5 py-3.5 sm:py-4.5 hover:bg-surface-high/30 transition-colors flex flex-col justify-between min-w-0 relative',
              isFifthCardOnTablet && 'sm:max-lg:col-span-2',
            )}
          >
            {/* Top: Label + Info Tooltip + Icon */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
                  {card.label}
                </span>
                {card.tooltip && (
                  <span
                    className="relative group/tip inline-flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      tabIndex={0}
                      role="button"
                      aria-label={card.tooltip}
                      className="text-muted-foreground/40 hover:text-foreground focus:text-foreground transition-colors cursor-help p-0.5 outline-hidden"
                    >
                      <Info size={11} />
                    </span>
                    <span
                      role="tooltip"
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover/tip:block group-focus-within/tip:block z-50 w-60 p-2.5 rounded-md bg-popover text-popover-foreground text-[11.5px] font-sans normal-case tracking-normal leading-relaxed border border-border shadow-2xl pointer-events-none"
                    >
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-popover border-t border-l border-border" />
                      <span className="relative z-10">{card.tooltip}</span>
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground/60 group-hover:text-foreground transition-colors flex-shrink-0">
                {card.icon}
                <ArrowUpRight
                  size={12}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
            </div>

            {/* Value + Trend */}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl sm:text-2xl lg:text-[28px] font-semibold text-foreground tabular-nums leading-none tracking-tight">
                {card.value}
              </span>

              {card.trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[11.5px] font-medium tabular-nums',
                    trendPositive
                      ? 'text-foreground dark:text-primary'
                      : 'text-red-500 dark:text-red-400',
                  )}
                >
                  {trendPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  <span>{card.trend}</span>
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
