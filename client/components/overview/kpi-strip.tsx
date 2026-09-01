'use client';

import Link from 'next/link';
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
      className="border-t border-b border-border divide-x divide-border flex"
      role="region"
      aria-label="Key performance metrics"
    >
      {cards.map((card) => {
        const trendPositive = card.trend && !card.trend.startsWith('-');
        return (
          <Link
            key={card.id}
            href={card.href}
            id={`kpi-${card.id}`}
            className="flex-1 group px-5 py-4 hover:bg-surface-high/30 transition-colors flex flex-col gap-1.5 min-w-0"
          >
            <span className="text-[11.5px] font-medium text-muted-foreground truncate">
              {card.label}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-foreground font-mono tabular-nums leading-none tracking-tight">
                {card.value}
              </span>
              {card.trend && (
                <span
                  className={cn(
                    'text-xs font-mono font-medium',
                    trendPositive
                      ? 'text-[color:var(--status-online)]'
                      : 'text-[color:var(--status-error)]',
                  )}
                >
                  {card.trend}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground/60 font-mono truncate">
              {card.meta}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
