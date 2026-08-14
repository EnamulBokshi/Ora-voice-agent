'use client';

import { Zap } from 'lucide-react';

const SALES_ACTIONS = [
  { label: 'Recommendations Offered', count: 24, delta: '+8' },
  { label: 'Upsells Accepted', count: 9, delta: '+3' },
  { label: 'Items Added to Cart', count: 17, delta: '+5' },
  { label: 'Checkout Assisted', count: 11, delta: '+4' },
  { label: 'Orders Placed Live', count: 6, delta: '+2' },
];

export function SalesActionsPanel() {
  const maxCount = SALES_ACTIONS[0].count;

  return (
    <div className="rounded-md border border-border bg-surface-container overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-primary fill-primary" />
          <h3 className="text-[12px] font-semibold text-foreground">Sales Conversions</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          LAST 1 HR
        </span>
      </div>

      {/* Action rows */}
      <div className="p-3.5 space-y-3">
        {SALES_ACTIONS.map((action, i) => {
          const pct = Math.round((action.count / maxCount) * 100);

          return (
            <div key={action.label} className="space-y-1">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-muted-foreground">{action.label}</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-foreground font-semibold tabular-nums text-[12px]">
                    {action.count}
                  </span>
                  <span className="text-[10px] text-[color:var(--status-online)] font-medium">
                    {action.delta}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-surface-high overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor:
                      i === 0
                        ? 'var(--primary)'
                        : i === 4
                        ? 'var(--ora-success)'
                        : 'var(--chart-2)',
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
