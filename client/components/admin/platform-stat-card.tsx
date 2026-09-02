'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MetricDisplay } from '@/components/ui/metric-display';

interface PlatformStatCardProps {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
  subtext?: React.ReactNode;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  highlight?: boolean;
  valueColor?: string;
}

export function PlatformStatCard({
  title,
  value,
  prefix,
  suffix,
  subtitle,
  subtext,
  icon,
  trend,
  trendUp = true,
  highlight = false,
  valueColor,
}: PlatformStatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-container p-5 shadow-xs transition-colors hover:border-border/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors',
            highlight
              ? 'bg-surface-high text-primary'
              : 'bg-surface-high text-muted-foreground',
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <MetricDisplay
          value={value}
          prefix={prefix}
          suffix={suffix}
          className={valueColor}
        />
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
              trendUp ? 'text-primary' : 'text-destructive',
            )}
          >
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <div className="mt-2 text-xs text-muted-foreground tabular-nums">
          {subtext}
        </div>
      )}

      {subtitle && !subtext && (
        <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
