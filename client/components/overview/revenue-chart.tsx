'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
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
  { label: 'Week 1', value: 0 },
  { label: 'Week 2', value: 0 },
  { label: 'Week 3', value: 0 },
  { label: 'Week 4', value: 0 },
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

  const dailyData = daily && daily.length > 0 ? daily : DEFAULT_DAILY;
  const weeklyData = weekly && weekly.length > 0 ? weekly : DEFAULT_WEEKLY;
  const activeData = period === 'daily' ? dailyData : weeklyData;

  const rawMax = Math.max(...activeData.map((d) => d.value), 0);
  const maxValue = rawMax > 0 ? rawMax : 100;
  const minValue = 0;
  const activeSum = activeData.reduce((acc, d) => acc + d.value, 0);
  const displayRevenue = totalRevenue !== undefined && period === 'weekly' ? totalRevenue : activeSum;

  const isPositiveGrowth = !growthRate.startsWith('-');

  // SVG coordinate calculations (viewBox 0 0 600 180)
  const width = 600;
  const height = 180;
  const paddingX = 20;
  const paddingY = 20;

  const points = activeData.map((d, index) => {
    const x =
      activeData.length === 1
        ? width / 2
        : paddingX + (index / (activeData.length - 1)) * (width - 2 * paddingX);
    const y =
      rawMax === 0
        ? height - paddingY
        : height - paddingY - ((d.value - minValue) / (maxValue - minValue)) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  // Build SVG path
  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="rounded-md border border-border bg-surface-container p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign size={15} className="text-primary" />
            <h3 className="text-[13px] font-semibold text-foreground">Revenue Performance</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Direct sales and assisted cart conversions
          </p>
        </div>

        {/* Controls & Period Selector */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded',
              isPositiveGrowth
                ? 'text-[color:var(--status-online)] bg-[color:var(--status-online)]/10'
                : 'text-[color:var(--status-error)] bg-[color:var(--status-error)]/10',
            )}
          >
            {isPositiveGrowth ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {growthRate} this week
          </div>

          <div className="inline-flex rounded-md bg-surface-low p-0.5 border border-border">
            {(['daily', 'weekly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-medium rounded capitalize transition-colors',
                  period === p
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Callout */}
      <div className="py-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {formatCurrency(displayRevenue)}
        </span>
        <span className="text-[11px] text-muted-foreground">
          total {period === 'daily' ? 'past 7 days' : 'past 4 weeks'}
        </span>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full h-44 mt-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          aria-label="Revenue performance graph"
        >
          <defs>
            <linearGradient id="revenue-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="90%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <line
              key={pct}
              x1="0"
              y1={height * pct - 5}
              x2={width}
              y2={height * pct - 5}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#revenue-area-gradient)" />

          {/* Curve Line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Nodes */}
          {points.map((pt, i) => (
            <g key={`${pt.label}-${i}`} className="group">
              <circle
                cx={pt.x}
                cy={pt.y}
                r={i === points.length - 1 ? 4.5 : 3.5}
                fill={i === points.length - 1 ? 'var(--primary)' : 'var(--background)'}
                stroke="var(--primary)"
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>

        {/* X-Axis Labels */}
        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 px-1 font-mono">
          {activeData.map((d, i) => (
            <span key={`${d.label}-${i}`}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

