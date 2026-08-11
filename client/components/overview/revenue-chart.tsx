'use client';

import { useState } from 'react';

type Period = 'daily' | 'weekly';

const chartPaths: Record<Period, { line: string; area: string }> = {
  daily: {
    line: 'M0,180 C100,160 200,190 300,120 C400,50 500,140 600,100 C700,60 800,90 900,40 C950,15 1000,20 1000,20',
    area: 'M0,180 C100,160 200,190 300,120 C400,50 500,140 600,100 C700,60 800,90 900,40 C950,15 1000,20 1000,20 L1000,200 L0,200 Z',
  },
  weekly: {
    line: 'M0,160 C100,140 200,170 300,100 C400,30 500,120 600,80 C700,40 800,70 900,20 C950,5 1000,8 1000,8',
    area: 'M0,160 C100,140 200,170 300,100 C400,30 500,120 600,80 C700,40 800,70 900,20 C950,5 1000,8 1000,8 L1000,200 L0,200 Z',
  },
};

const xLabels: Record<Period, string[]> = {
  daily:  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  weekly: ['W1',  'W2',  'W3',  'W4',  'W5',  'W6',  'W7'],
};

const yLabels = ['$5k', '$3.7k', '$2.5k', '$1.2k', '$0'];

export function RevenueChart() {
  const [period, setPeriod] = useState<Period>('daily');

  return (
    <div
      className="flex flex-col h-full rounded-2xl p-6"
      style={{
        background:     'var(--glass-bg)',
        border:         '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Revenue attributed to ORA</h3>
          <p className="text-xs mt-1 text-muted-foreground">Direct sales and influenced conversions</p>
        </div>
        <div className="flex gap-2">
          {(['daily', 'weekly'] as Period[]).map((p) => (
            <button
              key={p}
              id={`revenue-period-${p}`}
              onClick={() => setPeriod(p)}
              className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 capitalize"
              style={
                period === p
                  ? { background: 'var(--glass-border)', color: 'var(--foreground)',       border: '1px solid var(--glass-border)' }
                  : { background: 'transparent',          color: 'var(--muted-foreground)', border: '1px solid transparent'        }
              }
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      <div className="flex-1 relative" style={{ minHeight: '240px' }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between pb-6 select-none text-muted-foreground" style={{ fontSize: '10px' }}>
          {yLabels.map((l) => <span key={l}>{l}</span>)}
        </div>

        {/* SVG area */}
        <div className="absolute inset-0 ml-10">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-label="Revenue area chart">
            <defs>
              <linearGradient id="rev-area-grad" x1="0%" x2="0%" y1="0%" y2="100%">
                {/* Use CSS vars in SVG gradient stops */}
                <stop offset="0%"   stopColor="var(--chart-3)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 50, 100, 150, 200].map((y) => (
              <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="var(--glass-border)" strokeWidth="1" />
            ))}

            <path d={chartPaths[period].area} fill="url(#rev-area-grad)" />
            <path
              d={chartPaths[period].line}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Mid data points */}
            {[{ cx: 300, cy: 120 }, { cx: 600, cy: 100 }, { cx: 900, cy: 40 }].map((pt) => (
              <circle key={`${pt.cx}`} cx={pt.cx} cy={pt.cy} r="4" fill="var(--background)" stroke="var(--primary)" strokeWidth="2" />
            ))}

            {/* Glowing last data point */}
            <circle cx="1000" cy="20" r="5" fill="var(--foreground)" stroke="var(--primary)" strokeWidth="3"
              style={{ filter: 'drop-shadow(0 0 6px var(--primary))' }}
            />
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between pt-2 select-none text-muted-foreground" style={{ fontSize: '10px' }}>
            {xLabels[period].map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
