'use client';

import { Zap } from 'lucide-react';
import type { LiveSalesAction } from '@/services/live-desk-service';

const DEFAULT_SALES_ACTIONS: LiveSalesAction[] = [
  { label: 'Recommendations Offered', count: 0, delta: '+0' },
  { label: 'Upsells Accepted', count: 0, delta: '+0' },
  { label: 'Items Added to Cart', count: 0, delta: '+0' },
  { label: 'Checkout Assisted', count: 0, delta: '+0' },
  { label: 'Orders Placed Live', count: 0, delta: '+0' },
];

interface SalesActionsPanelProps {
  actions?: LiveSalesAction[] | null;
}

export function SalesActionsPanel({ actions }: SalesActionsPanelProps) {
  const items = actions && actions.length > 0 ? actions : DEFAULT_SALES_ACTIONS;
  const maxCount = Math.max(...items.map((a) => a.count), 1);

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-muted-foreground" />
          <h3 className="text-[12px] font-semibold text-foreground">Sales Conversions</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          LAST 1 HR
        </span>
      </div>

      {/* Action rows */}
      <div className="p-3.5 space-y-3">
        {items.map((action, i) => {
          const pct = Math.round((action.count / maxCount) * 100);

          return (
            <div key={action.label} className="space-y-1">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-muted-foreground">{action.label}</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-foreground font-semibold tabular-nums text-[12px]">
                    {action.count}
                  </span>
                  {action.delta && action.delta !== '+0' && action.delta !== '0' ? (
                    <span
                      className={`text-[10px] font-medium ${
                        action.delta.startsWith('-')
                          ? 'text-[color:var(--status-error)]'
                          : 'text-[color:var(--status-online)]'
                      }`}
                    >
                      {action.delta}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">— 0</span>
                  )}
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

