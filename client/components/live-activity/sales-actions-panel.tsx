const SALES_ACTIONS = [
  { label: 'Recommendation', count: 18 },
  { label: 'Upsell',         count: 7  },
  { label: 'Cart Addition',  count: 17 },
  { label: 'Checkout',       count: 9  },
  { label: 'Orders',         count: 6  },
];

export function SalesActionsPanel() {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background:     'var(--glass-bg)',
        border:         '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center pb-3"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {/* Bolt icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--chart-4)' }} aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Sales Actions
        </h3>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Last HR
        </span>
      </div>

      {/* Action rows */}
      <div className="space-y-3">
        {SALES_ACTIONS.map((action, i) => {
          const maxCount = SALES_ACTIONS[0].count;
          const pct      = (action.count / maxCount) * 100;
          return (
            <div key={action.label} className="flex justify-between items-center text-sm gap-3">
              <span className="text-muted-foreground flex-shrink-0">{action.label}</span>
              {/* Mini bar */}
              <div
                className="flex-1 h-1 rounded-full overflow-hidden"
                style={{ background: 'var(--surface-highest)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width:      `${pct}%`,
                    background: i === 0 ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 50%, var(--secondary))',
                  }}
                />
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded flex-shrink-0"
                style={{ background: 'var(--surface-high)', color: 'var(--foreground)' }}
              >
                {action.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
