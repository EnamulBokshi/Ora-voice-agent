'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PlatformStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  highlight?: boolean;
}

export function PlatformStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp = true,
  highlight = false,
}: PlatformStatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 transition-all duration-200',
        highlight
          ? 'border-primary/40 bg-surface-container shadow-lg shadow-primary/5'
          : 'border-border bg-surface-container hover:border-border/80',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            highlight
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-high text-foreground',
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black tracking-tight text-foreground font-mono">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold font-mono',
              trendUp ? 'text-primary' : 'text-destructive',
            )}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
      )}

      {highlight && (
        <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-transparent via-primary to-primary/40" />
      )}
    </div>
  );
}
