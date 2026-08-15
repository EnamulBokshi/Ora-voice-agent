'use client';

import { Filter } from 'lucide-react';

export interface FunnelStep {
  label: string;
  count: number;
  pct: number;
  isLast?: boolean;
}

const DEFAULT_FUNNEL: FunnelStep[] = [
  { label: 'Shopper Inquiries', count: 0, pct: 100 },
  { label: 'Products Recommended', count: 0, pct: 0 },
  { label: 'Items Added to Cart', count: 0, pct: 0 },
  { label: 'Orders Completed', count: 0, pct: 0, isLast: true },
];

export interface SalesFunnelProps {
  funnel?: FunnelStep[];
  overallConversion?: number;
}

export function SalesFunnel({ funnel, overallConversion = 0 }: SalesFunnelProps) {
  const steps = funnel && funnel.length > 0 ? funnel : DEFAULT_FUNNEL;

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
        {steps.map((step) => (
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
                  width: `${Math.min(100, Math.max(0, step.pct))}%`,
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
          {overallConversion}%
        </span>
      </div>
    </div>
  );
}

