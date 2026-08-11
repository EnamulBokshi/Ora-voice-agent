'use client';

import { useEffect, useState } from 'react';

// Avatar / chip color series — use chart tokens from globals.css
// These are intentional per-series differentiators, not brand colors
interface ItemColors {
  avatarBg:     string;
  avatarColor:  string;
  avatarBorder: string;
  chipColor:    string;
  chipBg:       string;
  chipBorder:   string;
}

const SERIES: ItemColors[] = [
  {
    avatarBg:     'color-mix(in srgb, var(--chart-1) 20%, transparent)',
    avatarColor:  'var(--chart-1)',
    avatarBorder: 'color-mix(in srgb, var(--chart-1) 35%, transparent)',
    chipColor:    'var(--chart-1)',
    chipBg:       'color-mix(in srgb, var(--chart-1) 12%, transparent)',
    chipBorder:   'color-mix(in srgb, var(--chart-1) 25%, transparent)',
  },
  {
    avatarBg:     'color-mix(in srgb, var(--chart-3) 20%, transparent)',
    avatarColor:  'var(--chart-3)',
    avatarBorder: 'color-mix(in srgb, var(--chart-3) 35%, transparent)',
    chipColor:    'var(--chart-3)',
    chipBg:       'color-mix(in srgb, var(--chart-3) 12%, transparent)',
    chipBorder:   'color-mix(in srgb, var(--chart-3) 25%, transparent)',
  },
  {
    avatarBg:     'color-mix(in srgb, var(--chart-2) 20%, transparent)',
    avatarColor:  'var(--chart-2)',
    avatarBorder: 'color-mix(in srgb, var(--chart-2) 35%, transparent)',
    chipColor:    'var(--chart-2)',
    chipBg:       'color-mix(in srgb, var(--chart-2) 12%, transparent)',
    chipBorder:   'color-mix(in srgb, var(--chart-2) 25%, transparent)',
  },
  {
    avatarBg:     'color-mix(in srgb, var(--chart-4) 20%, transparent)',
    avatarColor:  'var(--chart-4)',
    avatarBorder: 'color-mix(in srgb, var(--chart-4) 35%, transparent)',
    chipColor:    'var(--chart-4)',
    chipBg:       'color-mix(in srgb, var(--chart-4) 12%, transparent)',
    chipBorder:   'color-mix(in srgb, var(--chart-4) 25%, transparent)',
  },
  {
    avatarBg:     'color-mix(in srgb, var(--chart-5) 20%, transparent)',
    avatarColor:  'var(--chart-5)',
    avatarBorder: 'color-mix(in srgb, var(--chart-5) 35%, transparent)',
    chipColor:    'var(--chart-1)',
    chipBg:       'color-mix(in srgb, var(--chart-1) 12%, transparent)',
    chipBorder:   'color-mix(in srgb, var(--chart-1) 25%, transparent)',
  },
];

interface ActivityItem {
  id:         string;
  initials:   string;
  name:       string;
  message:    string;
  time:       string;
  chipLabel:  string;
  seriesIdx:  number;
  showPulse?: boolean;
}

const initialItems: ActivityItem[] = [
  { id: '1', initials: 'RK', name: 'Rafi Khan',      message: '"Do you have the Nike Pegasus in size 10?"', time: 'Now',   chipLabel: 'Checked inventory',    seriesIdx: 0, showPulse: true  },
  { id: '2', initials: 'SA', name: 'Sarah Ahmed',    message: '"How long does shipping to Dhaka take?"',    time: '1m ago', chipLabel: 'Answered policy',      seriesIdx: 1, showPulse: true  },
  { id: '3', initials: 'TH', name: 'Tanvir Hasan',   message: 'Reviewing cart (2 items)',                   time: '2m ago', chipLabel: 'Offered 10% discount', seriesIdx: 2, showPulse: true  },
  { id: '4', initials: 'NI', name: 'Nabila Islam',   message: '"Can I return this if it doesn\'t fit?"',    time: '5m ago', chipLabel: 'Answered policy',      seriesIdx: 3 },
  { id: '5', initials: 'AH', name: 'Arman Hossain',  message: 'Order #10492 placed',                        time: '8m ago', chipLabel: 'Processed payment',    seriesIdx: 4 },
];

const rotatingItems: Omit<ActivityItem, 'id'>[] = [
  { initials: 'MJ', name: 'Maria Jose',   message: '"Is free shipping available?"',  time: 'Now', chipLabel: 'Checked shipping',  seriesIdx: 0, showPulse: true },
  { initials: 'RV', name: 'Rahul Varma',  message: '"Best laptop bag under $50?"',   time: 'Now', chipLabel: 'Searched catalog',  seriesIdx: 1, showPulse: true },
  { initials: 'JL', name: 'Jasmine Lee',  message: '"Do you ship internationally?"', time: 'Now', chipLabel: 'Answered policy',   seriesIdx: 2, showPulse: true },
];

export function LiveActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>(initialItems);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      const next = rotatingItems[idx % rotatingItems.length];
      setItems((prev) => [
        { ...next, id: String(Date.now()) },
        ...prev.map((item, i) => ({ ...item, time: i === 0 ? '1m ago' : item.time, showPulse: false })).slice(0, 4),
      ]);
      idx++;
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-col h-full rounded-2xl"
      style={{
        background:     'var(--glass-bg)',
        border:         '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-0">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
          </svg>
          Live Interactions
        </h3>
        <button
          id="live-interactions-view-all"
          className="text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80"
        >
          View All
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-5 pt-4 space-y-3 scrollbar-thin">
        {items.map((item) => {
          const s = SERIES[item.seriesIdx % SERIES.length];
          return (
            <div
              key={item.id}
              className="p-3 rounded-xl cursor-pointer transition-all duration-300"
              style={{
                background: 'var(--glass-bg)',
                border:     '1px solid var(--glass-border)',
              }}
            >
              {/* Top row */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: s.avatarBg, color: s.avatarColor, border: `1px solid ${s.avatarBorder}` }}
                  >
                    {item.initials}
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {item.showPulse && (
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--ora-success)' }} />
                  )}
                  {item.time}
                </span>
              </div>

              {/* Message */}
              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{item.message}</p>

              {/* Action chip */}
              <div
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{ color: s.chipColor, background: s.chipBg, border: `1px solid ${s.chipBorder}` }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                {item.chipLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
