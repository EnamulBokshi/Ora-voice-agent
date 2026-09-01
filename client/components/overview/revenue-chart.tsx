'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

type Period = 'daily' | 'weekly';

export interface ChartDataPoint {
  label: string;
  date?: string;
  value: number;
}

const DEFAULT_DAILY: ChartDataPoint[] = [
  { label: 'Mon', value: 0 }, { label: 'Tue', value: 0 }, { label: 'Wed', value: 0 },
  { label: 'Thu', value: 0 }, { label: 'Fri', value: 0 }, { label: 'Sat', value: 0 }, { label: 'Sun', value: 0 },
];

const DEFAULT_WEEKLY: ChartDataPoint[] = [
  { label: 'Wk 1', value: 0 }, { label: 'Wk 2', value: 0 },
  { label: 'Wk 3', value: 0 }, { label: 'Wk 4', value: 0 },
];

export interface RevenueChartProps {
  daily?: ChartDataPoint[];
  weekly?: ChartDataPoint[];
  growthRate?: string;
  totalRevenue?: number;
}

export function RevenueChart({ daily, weekly, growthRate = '+0.0%', totalRevenue }: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>('daily');

  const dailyData  = daily?.length  ? daily  : DEFAULT_DAILY;
  const weeklyData = weekly?.length ? weekly : DEFAULT_WEEKLY;
  const activeData = period === 'daily' ? dailyData : weeklyData;
  const rawMax     = Math.max(...activeData.map((d) => d.value), 0);
  const maxValue   = rawMax > 0 ? rawMax : 100;
  const activeSum  = activeData.reduce((a, d) => a + d.value, 0);
  const displayRevenue = totalRevenue !== undefined && period === 'weekly' ? totalRevenue : activeSum;
  const isPos      = !growthRate.startsWith('-');

  const W = 600, H = 160, PX = 16, PY = 16;
  const points = activeData.map((d, i) => ({
    ...d,
    x: activeData.length === 1 ? W / 2 : PX + (i / (activeData.length - 1)) * (W - 2 * PX),
    y: rawMax === 0 ? H - PY : H - PY - ((d.value) / maxValue) * (H - 2 * PY),
  }));

  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx = prev.x + (pt.x - prev.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');
  const areaPath = rawMax > 0 ? `${linePath} L ${points.at(-1)!.x} ${H} L ${points[0].x} ${H} Z` : '';

  return (
    <div>
      {/* Sub-section header row */}
      <div className="flex items-center justify-between pt-5 pb-4 border-b border-border">
        <div className="flex items-baseline gap-3">
          <span className="text-[13px] font-semibold text-foreground">Revenue Performance</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[20px] font-bold font-mono tabular-nums text-foreground">
              {formatCurrency(displayRevenue)}
            </span>
            <span className={cn(
              'text-[11px] font-semibold font-mono flex items-center gap-0.5',
              isPos ? 'text-[color:var(--status-online)]' : 'text-[color:var(--status-error)]'
            )}>
              {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {growthRate}
            </span>
          </div>
        </div>

        {/* Period toggle — minimal underline style */}
        <div className="flex items-center gap-0">
          {(['daily', 'weekly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1 text-[12px] capitalize transition-colors border-b-2',
                period === p
                  ? 'border-foreground text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="pt-4 pb-2 relative min-h-[180px]">
        {rawMax === 0 ? (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden>
              {[0.33, 0.66].map((pct) => (
                <line key={pct} x1="0" y1={H * pct} x2={W} y2={H * pct}
                  stroke="var(--border)" strokeDasharray="4 6" strokeWidth="1" opacity="0.5" />
              ))}
              <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="var(--border)" strokeWidth="1" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[12px] text-muted-foreground/60">No revenue data for this period</p>
            </div>
          </>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-label="Revenue chart">
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="var(--primary)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.33, 0.66].map((pct) => (
              <line key={pct} x1="0" y1={H * pct} x2={W} y2={H * pct}
                stroke="var(--border)" strokeDasharray="3 4" strokeWidth="1" opacity="0.5" />
            ))}
            <path d={areaPath} fill="url(#rg)" />
            <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
            {points.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r={3}
                fill={i === points.length - 1 ? 'var(--primary)' : 'var(--background)'}
                stroke="var(--primary)" strokeWidth="1.5" />
            ))}
          </svg>
        )}

        {/* X-axis labels */}
        <div className="flex justify-between text-[10.5px] text-muted-foreground/50 font-mono pt-1 px-0.5">
          {activeData.map((d, i) => <span key={i}>{d.label}</span>)}
        </div>
      </div>
    </div>
  );
}
