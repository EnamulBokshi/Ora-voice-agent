'use client';

import { CustomerJourneyEvent } from '../customers-types';

interface CustomerJourneyTimelineProps {
  journey: CustomerJourneyEvent[];
}

export function CustomerJourneyTimeline({ journey }: CustomerJourneyTimelineProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b pb-1.5" style={{ borderColor: 'var(--glass-border)' }}>
        Customer Journey Timeline
      </h4>

      <div className="space-y-3 border-l-2 ml-2 pl-3" style={{ borderColor: 'var(--glass-border)' }}>
        {journey.map((j, idx) => (
          <div key={idx} className="relative text-xs">
            <div
              className="absolute -left-[17px] top-1 w-2 h-2 rounded-full shadow-sm"
              style={{
                backgroundColor:
                  j.type === 'order'
                    ? 'var(--ora-success)'
                    : j.type === 'question'
                    ? 'var(--primary)'
                    : 'var(--secondary)',
              }}
            />
            <span className="text-[10px] text-muted-foreground block mb-0.5">{j.time}</span>
            <div
              className="p-2.5 rounded-xl border text-foreground text-[11px]"
              style={{
                background: 'var(--surface-container)',
                borderColor: 'var(--glass-border)',
              }}
            >
              {j.event}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
