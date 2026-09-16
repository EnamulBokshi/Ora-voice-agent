'use client';

import { ShoppingBag, TrendingUp } from 'lucide-react';
import type { LiveSalesAction } from '@/services/live-desk-service';

const DEFAULT_SALES_ACTIONS: LiveSalesAction[] = [
  { label: 'Products Recommended', count: 18, delta: '+4' },
  { label: 'Upsells Accepted', count: 6, delta: '+2' },
  { label: 'Items Added to Cart', count: 12, delta: '+3' },
  { label: 'Checkout Assisted', count: 8, delta: '+1' },
  { label: 'Orders Completed Live', count: 5, delta: '+2' },
];

interface SalesActionsPanelProps {
  actions?: LiveSalesAction[] | null;
}

export function SalesActionsPanel({ actions }: SalesActionsPanelProps) {
  const items = actions && actions.length > 0 ? actions : DEFAULT_SALES_ACTIONS;
  const maxCount = Math.max(...items.map((a) => a.count), 1);

  return (
    <div className="overflow-hidden bg-transparent">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-foreground">
            Live Conversions
          </h3>
        </div>
        <span className="text-[10.5px] text-muted-foreground uppercase tracking-wider">
          TOTAL
        </span>
      </div>

      {/* Action telemetry rows */}
      <div className="p-4 space-y-3.5 bg-transparent">
        {items.map((action, i) => {
          const pct = Math.round((action.count / maxCount) * 100);

          return (
            <div key={action.label} className="space-y-1.5">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-muted-foreground">{action.label}</span>
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className="text-foreground font-semibold tabular-nums text-[12.5px]">
                    {action.count}
                  </span>
                  {action.delta && action.delta !== '+0' && action.delta !== '0' ? (
                    <span className="text-[11px] font-medium text-foreground dark:text-[#C8F031]">
                      {action.delta}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">—</span>
                  )}
                </div>
              </div>

              {/* Progress bar — clean hairline non-rounded */}
              <div className="h-1.5 w-full rounded-none bg-surface-high overflow-hidden border border-border/20">
                <div
                  className="h-full rounded-none transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor:
                      i === 4
                        ? 'var(--primary)'
                        : 'var(--chart-4)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
