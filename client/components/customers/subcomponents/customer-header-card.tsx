'use client';

import { CustomerRecord } from '../customers-types';

interface CustomerHeaderCardProps {
  customer: CustomerRecord;
}

export function CustomerHeaderCard({ customer: c }: CustomerHeaderCardProps) {
  return (
    <div
      className="p-5 border-b space-y-4"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border shrink-0"
          style={{
            background: 'var(--surface-high)',
            borderColor: 'var(--glass-border)',
            color: 'var(--primary)',
          }}
        >
          {c.name.charAt(0)}
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">{c.name}</h3>
          <p className="text-xs text-muted-foreground">{c.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                color: 'var(--primary)',
              }}
            >
              {c.segment}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{
                background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                color: 'var(--ora-success)',
              }}
            >
              Active
            </span>
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Box */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground font-semibold block">Conv</span>
          <span className="text-xs font-bold text-foreground">{c.conversationsCount}</span>
        </div>
        <div className="text-center border-l" style={{ borderColor: 'var(--glass-border)' }}>
          <span className="text-[10px] text-muted-foreground font-semibold block">Orders</span>
          <span className="text-xs font-bold text-foreground">{c.ordersCount}</span>
        </div>
        <div className="text-center border-l" style={{ borderColor: 'var(--glass-border)' }}>
          <span className="text-[10px] text-muted-foreground font-semibold block">Total</span>
          <span className="text-xs font-bold text-foreground">${c.totalSpent.toFixed(0)}</span>
        </div>
        <div className="text-center border-l" style={{ borderColor: 'var(--glass-border)' }}>
          <span className="text-[10px] text-muted-foreground font-semibold block">Avg</span>
          <span className="text-xs font-bold text-foreground">
            ${(c.totalSpent / (c.ordersCount || 1)).toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}
