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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Sub-section header row */}
      <div className="flex items-center justify-between pt-5 pb-4 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">
          Conversion Funnel
        </span>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-muted-foreground">Overall conversion:</span>
          <span className="font-bold text-foreground font-mono tabular-nums text-[13px]">
            {overallConversion}%
          </span>
        </div>
      </div>

      {/* Funnel Progress Steps */}
      <div className="py-5 space-y-4 max-w-2xl">
        {steps.map((step) => (
          <div key={step.label} className="space-y-1.5">
            <div className="flex justify-between items-center text-[12.5px]">
              <span className="text-foreground font-medium">{step.label}</span>
              <div className="flex items-center gap-2 font-mono text-[12px]">
                <span className="text-foreground font-semibold tabular-nums">
                  {step.count.toLocaleString()}
                </span>
                <span
                  className={
                    step.isLast
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground'
                  }
                >
                  ({step.pct}%)
                </span>
              </div>
            </div>

            {/* Step Bar */}
            <div className="h-1.5 w-full rounded-full bg-surface-high overflow-hidden">
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
    </div>
  );
}
