interface FunnelStep {
  label:      string;
  count:      string;
  pct:        number | null;
  barStyle:   string;        // CSS background value
  isLast:     boolean;
  indent:     string;
  lineLeft:   string;
}

const steps: FunnelStep[] = [
  { label: 'Conversations',    count: '1,284', pct: null, barStyle: 'var(--surface-highest)',                                            isLast: false, indent: 'pl-0',  lineLeft: ''     },
  { label: 'Searches/Queries', count: '945',   pct: 73,   barStyle: 'color-mix(in srgb, var(--primary) 40%, var(--surface-highest))',    isLast: false, indent: 'pl-4',  lineLeft: '7px'  },
  { label: 'Product Views',    count: '612',   pct: 64,   barStyle: 'color-mix(in srgb, var(--primary) 60%, var(--surface-highest))',    isLast: false, indent: 'pl-8',  lineLeft: '23px' },
  { label: 'Added to Cart',    count: '348',   pct: 56,   barStyle: 'color-mix(in srgb, var(--primary) 80%, var(--surface-highest))',    isLast: false, indent: 'pl-12', lineLeft: '39px' },
  { label: 'Orders Placed',    count: '236',   pct: 67,   barStyle: 'linear-gradient(90deg, var(--primary), var(--secondary))',          isLast: true,  indent: 'pl-16', lineLeft: '55px' },
];

export function SalesFunnel() {
  return (
    <div
      className="flex flex-col h-full rounded-2xl p-6"
      style={{
        background:     'var(--glass-bg)',
        border:         '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-semibold text-foreground">Conversation → Sales Funnel</h3>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </div>

      {/* Steps */}
      <div className="flex-1 flex flex-col justify-between">
        {steps.map((step, i) => (
          <div key={step.label} className={`group relative ${step.indent}`}>
            {/* Connector line */}
            {step.lineLeft && (
              <div
                className="absolute top-[-10px] bottom-6 w-px"
                style={{ left: step.lineLeft, background: 'var(--glass-border)' }}
              />
            )}

            {/* Label + count */}
            <div className="flex justify-between items-end mb-1" style={{ marginTop: i > 0 ? '12px' : 0 }}>
              <span className="text-sm font-medium text-foreground">{step.label}</span>
              <span
                className="text-sm font-bold"
                style={{ color: step.isLast ? 'var(--primary)' : 'var(--foreground)' }}
              >
                {step.count}
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="h-6 w-full rounded overflow-hidden relative"
              style={{
                background: 'var(--glass-bg)',
                border:     step.isLast ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                boxShadow:  step.isLast ? '0 0 10px color-mix(in srgb, var(--primary) 20%, transparent)' : 'none',
              }}
            >
              <div
                className="h-full rounded"
                style={{ width: `${step.pct ?? 100}%`, background: step.barStyle }}
              />
              {step.pct !== null && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                  style={{ color: step.isLast ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                >
                  {step.pct}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div
        className="mt-5 pt-4 flex justify-between items-center"
        style={{ borderTop: '1px solid var(--glass-border)' }}
      >
        <span className="text-xs text-muted-foreground">Overall Conversion</span>
        <span className="text-lg font-bold" style={{ color: 'var(--ora-success)' }}>18.4%</span>
      </div>
    </div>
  );
}
