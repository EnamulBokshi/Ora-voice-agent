'use client';

import { TrendingUp } from 'lucide-react';

const KPIS = [
  { label: 'ORA Revenue',      val: '$94,820', trend: '21.8%' },
  { label: 'Conversations',     val: '5,842',   trend: '18.4%' },
  { label: 'Conversion Rate',  val: '18.4%',   trend: '3.2%'  },
  { label: 'Orders Influenced',val: '1,024',   trend: '16.8%' },
  { label: 'Avg Order Value',  val: '$92.60',  trend: '7.4%'  },
];

export function AnalyticsTopKpis() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {KPIS.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-2xl p-4 border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] backdrop-blur-md relative overflow-hidden"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
            {kpi.label}
          </span>

          <div className="flex items-end justify-between mb-3">
            <span className="text-xl font-bold text-foreground tracking-tight leading-none">{kpi.val}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
              style={{
                background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                color: 'var(--ora-success)',
              }}
            >
              <TrendingUp size={10} /> {kpi.trend}
            </span>
          </div>

          {/* Sparkline mini chart */}
          <div className="h-8 w-full relative overflow-hidden opacity-80">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
              <path
                d="M0,20 L10,15 L20,18 L30,10 L40,12 L50,5 L60,8 L70,2 L80,5 L90,1 L100,0 L100,20 Z"
                fill="color-mix(in srgb, var(--primary) 12%, transparent)"
              />
              <path
                d="M0,20 L10,15 L20,18 L30,10 L40,12 L50,5 L60,8 L70,2 L80,5 L90,1 L100,0"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
