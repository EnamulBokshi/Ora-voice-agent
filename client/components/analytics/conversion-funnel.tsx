'use client';

const STAGES = [
  { label: 'Conversations',      val: '5,842', pct: '100%',  widthPct: 100 },
  { label: 'Product Discovery',  val: '3,912', pct: '67%',   widthPct: 67  },
  { label: 'Product Comparison', val: '2,184', pct: '37%',   widthPct: 37  },
  { label: 'Add to Cart',        val: '1,426', pct: '24%',   widthPct: 24  },
  { label: 'Checkout',           val: '1,118', pct: '19%',   widthPct: 19  },
  { label: 'Orders',             val: '1,024', pct: '17.5%', widthPct: 17.5, isFinal: true },
];

export function ConversionFunnel() {
  return (
    <div
      className="rounded-2xl p-5 border flex flex-col backdrop-blur-md"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4 pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        Conversation to Revenue Funnel
      </h3>

      <div className="space-y-3.5 flex-1 text-xs">
        {STAGES.map((s) => (
          <div key={s.label} className="space-y-1">
            <div className="flex justify-between items-center text-muted-foreground font-medium">
              <span className={s.isFinal ? 'text-foreground font-bold' : ''}>{s.label}</span>
              <span className="font-mono text-foreground font-semibold">
                {s.val} <span className="text-muted-foreground font-normal text-[11px] ml-1">{s.pct}</span>
              </span>
            </div>

            <div className="h-7 rounded-lg overflow-hidden border bg-[var(--surface-high)]/40 relative" style={{ borderColor: 'var(--glass-border)' }}>
              <div
                className="h-full rounded-lg transition-all duration-500"
                style={{
                  width: `${s.widthPct}%`,
                  background: s.isFinal
                    ? 'var(--logo-gradient)'
                    : 'color-mix(in srgb, var(--primary) 35%, transparent)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
