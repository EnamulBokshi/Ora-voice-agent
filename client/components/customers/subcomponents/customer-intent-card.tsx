'use client';

import { CustomerContext } from '../customers-types';

interface CustomerIntentCardProps {
  context: CustomerContext;
  purchaseIntentPct: number;
}

export function CustomerIntentCard({ context, purchaseIntentPct }: CustomerIntentCardProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Current Context */}
      <div
        className="p-3.5 rounded-2xl border space-y-2"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Context</span>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Budget</span>
            <span className="text-foreground font-bold">{context.budget}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interest</span>
            <span className="text-foreground font-bold">{context.interest}</span>
          </div>
          {context.size && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span className="text-foreground font-bold">{context.size}</span>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Intent Gauge */}
      <div
        className="p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center relative"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider absolute top-3 left-3">
          Purchase Intent
        </span>

        <div
          className="w-14 h-14 rounded-full border-4 flex items-center justify-center mt-3 font-bold font-mono text-sm"
          style={{
            borderColor: 'var(--secondary)',
            color: 'var(--secondary)',
          }}
        >
          {purchaseIntentPct}%
        </div>
        <span className="text-[10px] font-bold uppercase mt-1" style={{ color: 'var(--secondary)' }}>
          High Intent
        </span>
      </div>
    </div>
  );
}
