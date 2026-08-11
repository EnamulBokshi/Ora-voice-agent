'use client';

import { BookOpen, ArrowUpRight, Shuffle, Tag } from 'lucide-react';

const METRICS = [
  {
    label: 'ACTIVE RULES',
    val: 12,
    icon: BookOpen,
    colorVar: 'var(--primary)',
    bgVar: 'color-mix(in srgb, var(--primary) 12%, transparent)',
    borderVar: 'color-mix(in srgb, var(--primary) 25%, transparent)',
  },
  {
    label: 'UPSELL RULES',
    val: 4,
    icon: ArrowUpRight,
    colorVar: 'var(--secondary)',
    bgVar: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
    borderVar: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
  },
  {
    label: 'CROSS-SELL RULES',
    val: 3,
    icon: Shuffle,
    colorVar: 'var(--chart-3)',
    bgVar: 'color-mix(in srgb, var(--chart-3) 12%, transparent)',
    borderVar: 'color-mix(in srgb, var(--chart-3) 25%, transparent)',
  },
  {
    label: 'ACTIVE PROMOTIONS',
    val: 5,
    icon: Tag,
    colorVar: 'var(--chart-4)',
    bgVar: 'color-mix(in srgb, var(--chart-4) 12%, transparent)',
    borderVar: 'color-mix(in srgb, var(--chart-4) 25%, transparent)',
  },
];

export function SalesMetricsGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {METRICS.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className="rounded-2xl p-4 border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Ambient hover glow */}
            <div
              className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: m.colorVar }}
            />

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

            <span className="text-3xl font-bold text-foreground tracking-tight">{m.val}</span>
          </div>
        );
      })}
    </div>
  );
}
