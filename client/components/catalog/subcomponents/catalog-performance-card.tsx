'use client';

import { ProductPerformance } from '../catalog-types';

interface CatalogPerformanceCardProps {
  performance: ProductPerformance;
}

export function CatalogPerformanceCard({ performance }: CatalogPerformanceCardProps) {
  const stats = [
    { label: 'Convs', val: performance.conversations },
    { label: 'Recommended', val: performance.recommended },
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
              className="p-2.5 rounded-md border border-border bg-surface-low text-center flex flex-col justify-center"
            >
              <span className="text-[10px] text-muted-foreground block mb-0.5 truncate">{stat.label}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: stat.highlight ? 'var(--primary)' : 'var(--foreground)' }}
              >
                {stat.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
