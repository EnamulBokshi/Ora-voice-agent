'use client';

import { SlidersHorizontal, Star } from 'lucide-react';

const WEIGHTINGS = [
  { label: 'Customer Needs',    rating: 5, category: 'Core'    },
  { label: 'Product Relevance', rating: 5, category: 'Core'    },
  { label: 'Budget Fit',        rating: 5, category: 'Core'    },
  { label: 'Popularity Rank',   rating: 3, category: 'Dynamic' },
  { label: 'Profit Margin',     rating: 2, category: 'Dynamic' },
];

export function AiPrioritizationWeighting() {
  return (
    <div
      className="rounded-2xl p-4 border flex flex-col gap-3.5 backdrop-blur-md"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex justify-between items-center border-b pb-2.5" style={{ borderColor: 'var(--glass-border)' }}>
        <div>
          <h3 className="text-xs font-bold text-foreground tracking-tight flex items-center gap-2">
            AI Prioritization Weighting
          </h3>
          <p className="text-[10px] text-muted-foreground">Adjust relative weights for rule decisions</p>
        </div>
        <SlidersHorizontal size={15} style={{ color: 'var(--primary)' }} />
      </div>

      <div className="space-y-3 text-xs">
        {WEIGHTINGS.map((w, idx) => (
          <div key={w.label}>
            {idx === 3 && <div className="h-px my-2" style={{ background: 'var(--glass-border)' }} />}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium text-xs">{w.label}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={12}
                    className={star <= w.rating ? 'fill-current' : ''}
                    style={{
                      color: star <= w.rating ? 'var(--primary)' : 'var(--glass-border)',
                      filter: star <= w.rating ? 'drop-shadow(0 0 4px color-mix(in srgb, var(--primary) 50%, transparent))' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
