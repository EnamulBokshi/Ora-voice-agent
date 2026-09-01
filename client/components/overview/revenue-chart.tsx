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
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 0 },
  { label: 'Wed', value: 0 },
  { label: 'Thu', value: 0 },
  { label: 'Fri', value: 0 },
  { label: 'Sat', value: 0 },
  { label: 'Sun', value: 0 },
];

const DEFAULT_WEEKLY: ChartDataPoint[] = [
  { label: 'Wk 1', value: 0 },
  { label: 'Wk 2', value: 0 },
  { label: 'Wk 3', value: 0 },
  { label: 'Wk 4', value: 0 },
];

export interface RevenueChartProps {
  daily?: ChartDataPoint[];
  weekly?: ChartDataPoint[];
  growthRate?: string;
  totalRevenue?: number;
}

export function RevenueChart({
  daily,
  weekly,
  growthRate = '+0.0%',
  totalRevenue,
}: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>('daily');

  const dailyData = daily?.length ? daily : DEFAULT_DAILY;
  const weeklyData = weekly?.length ? weekly : DEFAULT_WEEKLY;
  const activeData = period === 'daily' ? dailyData : weeklyData;
  const rawMax = Math.max(...activeData.map((d) => d.value), 0);
  const maxValue = rawMax > 0 ? rawMax : 100;
  const activeSum = activeData.reduce((a, d) => a + d.value, 0);
  const displayRevenue = totalRevenue !== undefined && period === 'weekly' ? totalRevenue : activeSum;
  const isPos = !growthRate.startsWith('-');

  const W = 800;
  const H = 260;
  const PX = 20;
  const PY = 24;

  const points = activeData.map((d, i) => ({
    ...d,
    x: activeData.length === 1 ? W / 2 : PX + (i / (activeData.length - 1)) * (W - 2 * PX),
    y: rawMax === 0 ? H - PY : H - PY - (d.value / maxValue) * (H - 2 * PY),
  }));

  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx = prev.x + (pt.x - prev.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');
  const areaPath = rawMax > 0 ? `${linePath} L ${points.at(-1)!.x} ${H} L ${points[0].x} ${H} Z` : '';

  return (
    <div className="flex flex-col">
      {/* Metric & Period Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[11.5px] font-mono uppercase tracking-wider text-muted-foreground">
            Total Revenue Influenced
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[26px] font-semibold font-serif tabular-nums text-foreground">
              {formatCurrency(displayRevenue)}
            </span>
            <span
              className={cn(
                'text-[12px] font-semibold font-mono flex items-center gap-0.5',
                isPos
                  ? 'text-foreground dark:text-[#C8F031]'
                  : 'text-red-500 dark:text-red-400',
              )}
            >
              {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{growthRate}</span>
            </span>
          </div>
        </div>

        {/* Period Toggle — Flat Non-Rounded */}
        <div className="flex items-center gap-1 p-0.5 rounded-none bg-surface-high border border-border/40 text-[12px]">
          {(['daily', 'weekly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1 rounded-none capitalize transition-colors font-medium cursor-pointer',
                period === p
                  ? 'bg-surface-lowest text-foreground font-semibold shadow-xs border border-border/50'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="pt-2 pb-2 relative min-h-[270px]">
        {rawMax === 0 ? (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[260px]" preserveAspectRatio="none" aria-hidden>
              {[0.25, 0.5, 0.75].map((pct) => (
                <line
                  key={pct}
                  x1="0"
                  y1={H * pct}
                  x2={W}
                  y2={H * pct}
                  stroke="var(--border)"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                  opacity="0.4"
                />
              ))}
              <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="var(--border)" strokeWidth="1" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[13px] text-muted-foreground/60">No revenue records for this period</p>
            </div>
          </>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[260px] overflow-visible"
            preserveAspectRatio="none"
            aria-label="Revenue performance chart"
          >
            <defs>
              <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <line
                key={pct}
                x1="0"
                y1={H * pct}
                x2={W}
                y2={H * pct}
                stroke="var(--border)"
                strokeDasharray="3 4"
                strokeWidth="1"
                opacity="0.4"
              />
            ))}

            {/* Filled Area */}
            <path d={areaPath} fill="url(#revenue-gradient)" />

            {/* Main Stroke Line */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Point Markers */}
            {points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={4}
                fill={i === points.length - 1 ? 'var(--primary)' : 'var(--background)'}
                stroke="var(--primary)"
                strokeWidth="2"
              />
            ))}
          </svg>
        )}

        {/* X-axis Labels */}
        <div className="flex justify-between text-[11.5px] text-muted-foreground/80 font-mono pt-3 px-1 border-t border-border/20">
          {activeData.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
