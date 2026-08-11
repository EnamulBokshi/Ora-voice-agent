'use client';

const INTENTS = [
  { label: 'Checkout intent',    pct: 34.7, colorVar: 'var(--primary)'    },
  { label: 'Product comparison', pct: 22.8, colorVar: 'var(--secondary)'  },
  { label: 'Product discovery',  pct: 14.2, colorVar: 'var(--chart-3)'    },
  { label: 'Price question',     pct: 11.4, colorVar: 'var(--chart-4)'    },
  { label: 'Shipping query',     pct: 8.2,  colorVar: 'var(--ora-success)'},
  { label: 'Returns query',      pct: 5.6,  colorVar: 'var(--muted-foreground)'},
];

export function ConversionByIntent() {
  return (
    <div
      className="rounded-2xl p-5 border flex flex-col backdrop-blur-md"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4 pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        Conversion by Intent
      </h3>

      <div className="space-y-4 flex-1 text-xs justify-center flex flex-col">
        {INTENTS.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1 font-medium">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono font-bold" style={{ color: item.colorVar }}>
                {item.pct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--surface-high)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.pct}%`, background: item.colorVar }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
