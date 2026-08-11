'use client';

export function RevenueByChannelDonut() {
  return (
    <div
      className="rounded-2xl p-5 border flex flex-col items-center justify-between backdrop-blur-md"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground w-full text-left pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        Revenue by Channel
      </h3>

      {/* SVG Donut */}
      <div className="relative w-44 h-44 my-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--surface-high)" strokeWidth="12" />
          {/* Storefront 15% */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="var(--chart-3)"
            strokeWidth="12"
            strokeDasharray="251.2"
            strokeDashoffset="213.5"
            strokeLinecap="round"
          />
          {/* Chat 37% */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="var(--secondary)"
            strokeWidth="12"
            strokeDasharray="251.2"
            strokeDashoffset="158.2"
            strokeLinecap="round"
            className="origin-center rotate-[54deg]"
          />
          {/* Voice 48% */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="var(--primary)"
            strokeWidth="12"
            strokeDasharray="251.2"
            strokeDashoffset="130.6"
            strokeLinecap="round"
            className="origin-center rotate-[187deg]"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground">Total</span>
          <span className="text-base font-bold font-mono text-foreground">$94.8k</span>
        </div>
      </div>

      {/* Breakdown list */}
      <div className="w-full space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
            <span className="text-muted-foreground">Voice</span>
          </div>
          <span className="font-medium text-foreground">
            48% <span className="text-[11px] text-muted-foreground font-mono">($45,514)</span>
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--secondary)' }} />
            <span className="text-muted-foreground">Chat</span>
          </div>
          <span className="font-medium text-foreground">
            37% <span className="text-[11px] text-muted-foreground font-mono">($35,083)</span>
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--chart-3)' }} />
            <span className="text-muted-foreground">Storefront</span>
          </div>
          <span className="font-medium text-foreground">
            15% <span className="text-[11px] text-muted-foreground font-mono">($14,223)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
