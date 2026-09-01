'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KpiCardDef {
  id: string;
  label: string;
  value: string;
  meta: string;
  href: string;
  trend?: string;
  icon?: React.ReactNode;
}

interface KpiStripProps {
  cards: KpiCardDef[];
}

export function KpiStrip({ cards }: KpiStripProps) {
  return (
    <div
      className="w-full rounded-md border border-border/50 divide-y sm:divide-y-0 sm:divide-x divide-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-transparent overflow-hidden"
      role="region"
      aria-label="Key store performance metrics"
    >
      {cards.slice(0, 4).map((card) => {
        const trendPositive = card.trend && !card.trend.startsWith('-');
        return (
          <Link
            key={card.id}
            href={card.href}
            id={`kpi-${card.id}`}
            className="group px-5 py-4 hover:bg-surface-high/30 transition-colors flex flex-col justify-between min-w-0"
          >
            {/* Top: Label + Icon */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground truncate">
                {card.label}
              </span>
              <span className="text-muted-foreground/60 group-hover:text-foreground transition-colors flex-shrink-0">
                {card.icon}
              </span>
            </div>

            {/* Value + Trend */}
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-2xl lg:text-[28px] font-semibold text-foreground font-serif tabular-nums leading-none tracking-tight">
                {card.value}
              </span>

              {card.trend && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[11.5px] font-mono font-medium',
                    trendPositive
                      ? 'text-foreground dark:text-[#C8F031]'
                      : 'text-red-500 dark:text-red-400',
                  )}
                >
                  {trendPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  <span>{card.trend}</span>
                </span>
              )}
            </div>

            {/* Bottom: Meta subtitle + Hover indicator */}
            <div className="flex items-center justify-between text-[11.5px] text-muted-foreground/80 pt-1">
              <span className="truncate">{card.meta}</span>
              <ArrowUpRight
                size={12}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground flex-shrink-0"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
