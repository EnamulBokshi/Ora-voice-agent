'use client';

import { Calendar, Download, TrendingUp } from 'lucide-react';

interface AnalyticsHeaderProps {
  onExport?: () => void;
}

export function AnalyticsHeader({ onExport }: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
          <TrendingUp size={24} style={{ color: 'var(--primary)' }} />
          Analytics & Performance
        </h1>
        <p className="text-xs text-muted-foreground">
          Understand how ORA turns customer conversations into revenue.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          className="px-3.5 py-2 rounded-xl text-xs font-medium border text-foreground flex items-center gap-2 transition-all hover:bg-[var(--surface-high)]"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <Calendar size={14} style={{ color: 'var(--secondary)' }} />
          Last 30 days
        </button>

        <button
          onClick={onExport}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'var(--logo-gradient)',
            boxShadow: 'var(--logo-glow)',
          }}
        >
          <Download size={14} />
          Export report
        </button>
      </div>
    </div>
  );
}
