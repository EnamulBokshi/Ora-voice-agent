'use client';

import { TrendingUp } from 'lucide-react';
import { ProductPerformance } from '../catalog-types';

interface CatalogPerformanceCardProps {
  performance: ProductPerformance;
}

export function CatalogPerformanceCard({ performance }: CatalogPerformanceCardProps) {
  const stats = [
    { label: 'Convs', val: performance.conversations },
    { label: 'Recommended', val: performance.recommended },
    { label: 'Views', val: performance.views },
    { label: 'Orders', val: performance.orders, highlight: true },
    { label: 'Revenue', val: performance.revenue, highlight: true },
    { label: 'Conversion', val: performance.conversion },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div>
        <h4 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
          ORA Performance
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl border text-center flex flex-col justify-center"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <span className="text-[10px] text-muted-foreground block mb-0.5 truncate">{stat.label}</span>
              <span
                className="text-xs font-bold"
                style={{ color: stat.highlight ? 'var(--primary)' : 'var(--foreground)' }}
              >
                {stat.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Trend Sparkline */}
      <div
        className="h-24 rounded-xl border p-3 relative flex flex-col justify-between overflow-hidden"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground relative z-10 flex items-center gap-1">
          <TrendingUp size={12} style={{ color: 'var(--primary)' }} /> Revenue Trend
        </span>
        <svg
          className="absolute bottom-0 left-0 w-full h-16 pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 100 30"
        >
          <path
            d="M0,30 L0,20 C10,25 20,10 30,15 C40,20 50,5 60,10 C70,15 80,5 90,10 L100,0 L100,30 Z"
            fill="color-mix(in srgb, var(--primary) 12%, transparent)"
            stroke="var(--primary)"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}
