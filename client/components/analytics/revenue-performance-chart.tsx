'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

export function RevenuePerformanceChart() {
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D'>('30D');

  return (
    <div
      className="rounded-2xl p-6 border flex flex-col gap-6 relative overflow-hidden backdrop-blur-md mb-6"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: 'var(--primary)' }}
      />

      {/* Header & Timeframe Pills */}
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Revenue Performance
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold font-mono" style={{ color: 'var(--primary)' }}>
              $94,820
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border"
              style={{
                background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                color: 'var(--ora-success)',
              }}
            >
              <ArrowUpRight size={13} /> 21.8%
            </span>
          </div>
        </div>

        {/* 7D, 30D, 90D filter pills */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl border text-xs"
          style={{
            background: 'var(--surface-container)',
            borderColor: 'var(--glass-border)',
          }}
        >
          {(['7D', '30D', '90D'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                timeframe === t
                  ? 'bg-[var(--surface-high)] text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Area SVG Chart */}
      <div className="h-60 w-full relative z-10">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 250">
          <defs>
            <linearGradient id="area-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <path
            d="M0,50 L1000,50 M0,100 L1000,100 M0,150 L1000,150 M0,200 L1000,200"
            stroke="var(--glass-border)"
            strokeDasharray="4,4"
            strokeWidth="1"
          />

          {/* Area fill */}
          <path
            d="M0,250 L0,220 C100,230 150,180 250,190 C350,200 400,140 500,150 C600,160 650,80 750,90 C850,100 900,40 1000,20 L1000,250 Z"
            fill="url(#area-gradient)"
          />

          {/* Smooth line */}
          <path
            d="M0,220 C100,230 150,180 250,190 C350,200 400,140 500,150 C600,160 650,80 750,90 C850,100 900,40 1000,20"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
          />

          {/* Data Points */}
          <circle cx="500" cy="150" r="4" fill="var(--surface-container)" stroke="var(--primary)" strokeWidth="2" />
          <circle cx="750" cy="90" r="4" fill="var(--surface-container)" stroke="var(--primary)" strokeWidth="2" />
          <circle cx="1000" cy="20" r="5" fill="#fff" stroke="var(--primary)" strokeWidth="2.5" />
        </svg>
      </div>
    </div>
  );
}
