'use client';

import { Filter } from 'lucide-react';

interface FunnelStep {
  label: string;
  count: number;
  pct: number;
  isLast?: boolean;
}

const FUNNEL_STEPS: FunnelStep[] = [
  { label: 'Shopper Inquiries', count: 1284, pct: 100 },
  { label: 'Products Recommended', count: 892, pct: 69.4 },
  { label: 'Items Added to Cart', count: 340, pct: 26.5 },
  { label: 'Orders Completed', count: 236, pct: 18.4, isLast: true },
];

export function SalesFunnel() {
  return (
    <div className="rounded-md border border-border bg-surface-container p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="pb-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">Conversation → Sales Funnel</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Conversion stages across customer sessions
          </p>
        </div>
      </div>

      {/* Funnel Progress Steps */}
      <div className="py-4 space-y-3.5">
        {FUNNEL_STEPS.map((step) => (
          <div key={step.label} className="space-y-1.5">
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-muted-foreground font-medium">{step.label}</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-foreground font-semibold tabular-nums">
                  {step.count.toLocaleString()}
                </span>
                <span
                  className={
                    step.isLast
                      ? 'text-primary font-bold text-[11px]'
                      : 'text-muted-foreground text-[11px]'
                  }
                >
                  ({step.pct}%)
                </span>
              </div>
            </div>

            {/* Step Bar */}
            <div className="h-2 w-full rounded-full bg-surface-low overflow-hidden border border-border/60">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${step.pct}%`,
                  backgroundColor: step.isLast ? 'var(--primary)' : 'var(--chart-4)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">Overall Funnel Conversion</span>
        <span className="text-[14px] font-bold text-primary tabular-nums">
          18.4%
        </span>
      </div>
    </div>
  );
}
