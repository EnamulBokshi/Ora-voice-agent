'use client';

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
    <div className="flex flex-col flex-1 min-h-[270px]">
      {/* Conversion Rate Sub-header */}
      <div className="flex items-center justify-between pb-4 mb-3 border-b border-border/30">
        <span className="text-[12px] font-medium text-muted-foreground">
          Voice & Chat Conversion Funnel
        </span>
        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="text-muted-foreground">Overall conversion rate:</span>
          <span className="font-semibold text-foreground dark:text-primary font-mono tabular-nums text-[14px]">
            {overallConversion}%
          </span>
        </div>
      </div>

      {/* Funnel Progress Steps */}
      <div className="py-4 space-y-5 max-w-3xl">
        {steps.map((step, idx) => (
          <div key={step.label} className="space-y-2">
            <div className="flex justify-between items-center text-[13px]">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-mono font-bold text-muted-foreground px-2 py-0.5 rounded-none bg-surface-high border border-border/40">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-foreground font-medium">{step.label}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[12.5px]">
                <span className="text-foreground font-semibold tabular-nums">
                  {step.count.toLocaleString()}
                </span>
                <span
                  className={
                    step.isLast
                      ? 'text-foreground dark:text-primary font-semibold'
                      : 'text-muted-foreground'
                  }
                >
                  ({step.pct}%)
                </span>
              </div>
            </div>

            {/* Step Bar — Flat Non-Rounded */}
            <div className="h-3 w-full rounded-none bg-surface-high overflow-hidden border border-border/30">
              <div
                className="h-full rounded-none transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, step.pct))}%`,
                  backgroundColor: step.isLast ? 'var(--primary)' : 'var(--chart-4)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
