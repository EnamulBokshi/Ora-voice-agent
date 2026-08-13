'use client';

import { BarChart3 } from 'lucide-react';

interface AgentUsageMetricsCardProps {
  usageStats: {
    retrievals: number;
    trendPct: number;
  };
}

export function AgentUsageMetricsCard({ usageStats }: AgentUsageMetricsCardProps) {
  return (
    <div
      className="rounded-2xl p-4 border flex flex-col justify-between"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
        <BarChart3 size={14} /> Usage Metrics
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">{usageStats.retrievals}</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--ora-success)' }}>
            ↑ {usageStats.trendPct}%
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">Retrievals this week</p>
      </div>

      <div className="flex items-end gap-1.5 h-7 mt-3">
        {[30, 50, 40, 80, 60, 100].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${h}%`,
              background: i === 5 ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 30%, transparent)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
