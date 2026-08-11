'use client';

import { Sparkles } from 'lucide-react';
import { CustomerRecord } from './customers-types';
import { CustomerHeaderCard } from './subcomponents/customer-header-card';
import { CustomerIntentCard } from './subcomponents/customer-intent-card';
import { CustomerJourneyTimeline } from './subcomponents/customer-journey-timeline';

interface CustomerDetailPanelProps {
  customer: CustomerRecord;
}

export function CustomerDetailPanel({ customer }: CustomerDetailPanelProps) {
  const c = customer;

  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden backdrop-blur-md h-full"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Customer Header */}
      <CustomerHeaderCard customer={c} />

      {/* Scrollable Inspector Body */}
      <div className="p-5 space-y-5 flex-1 overflow-y-auto text-xs">
        {/* ORA AI Summary Card */}
        <div
          className="rounded-2xl p-4 border space-y-2 relative overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-container))',
            borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
          }}
        >
          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs" style={{ color: 'var(--primary)' }}>
            <Sparkles size={14} /> ORA Customer Summary
          </div>
          <p className="text-muted-foreground leading-relaxed text-xs">{c.oraSummary}</p>
        </div>

        {/* Bento Context & Intent Row */}
        <CustomerIntentCard
          context={c.context}
          purchaseIntentPct={c.purchaseIntentPct}
        />

        {/* Customer Interests */}
        <div className="space-y-3">
          <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b pb-1.5" style={{ borderColor: 'var(--glass-border)' }}>
            Customer Interests
          </h4>
          <div className="space-y-2.5">
            {c.interests.map((int, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] font-medium mb-1">
                  <span className="text-foreground">{int.name}</span>
                  <span className="text-muted-foreground font-mono">{int.pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--surface-high)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${int.pct}%`,
                      background: i === 0 ? 'var(--primary)' : 'var(--secondary)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Journey Timeline */}
        <CustomerJourneyTimeline journey={c.journey} />
      </div>
    </div>
  );
}
