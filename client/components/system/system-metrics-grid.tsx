'use client';

import { Database, Package, CheckCircle2, Clock } from 'lucide-react';

const METRICS = [
  {
    label: 'Connected Sources',
    val: '4',
    icon: Database,
    colorVar: 'var(--primary)',
    bgVar: 'color-mix(in srgb, var(--primary) 12%, transparent)',
    borderVar: 'color-mix(in srgb, var(--primary) 25%, transparent)',
  },
  {
    label: 'Products Indexed',
    val: '1,842',
    icon: Package,
    colorVar: 'var(--secondary)',
    bgVar: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
    borderVar: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
  },
  {
    label: 'Products Verified',
    val: '1,801',
    icon: CheckCircle2,
    colorVar: 'var(--ora-success)',
    bgVar: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
    borderVar: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
  },
  {
    label: 'Last Successful Sync',
    val: '2 min ago',
    icon: Clock,
    colorVar: 'var(--chart-3)',
    bgVar: 'color-mix(in srgb, var(--chart-3) 12%, transparent)',
    borderVar: 'color-mix(in srgb, var(--chart-3) 25%, transparent)',
  },
];

export function SystemMetricsGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {METRICS.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className="rounded-2xl p-4 border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden backdrop-blur-md"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {m.label}
              </span>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110"
                style={{
                  background: m.bgVar,
                  borderColor: m.borderVar,
                  color: m.colorVar,
                }}
              >
                <Icon size={16} />
              </div>
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">{m.val}</span>
          </div>
        );
      })}
    </div>
  );
}
