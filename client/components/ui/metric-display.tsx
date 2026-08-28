'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface MetricDisplayProps {
  value: string | number;
  prefix?: string;
  suffix?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Standard ORA Metric Value (Newsreader Serif + Tabular Nums)
 */
export function MetricDisplay({
  value,
  prefix,
  suffix,
  size = 'lg',
  className,
}: MetricDisplayProps) {
  const sizeClasses = {
    sm: 'text-xl font-semibold',
    md: 'text-2xl font-semibold',
    lg: 'text-2xl lg:text-[28px] font-semibold',
  };

  return (
    <span
      className={cn(
        'font-serif tabular-nums tracking-tight leading-none text-foreground',
        sizeClasses[size],
        className,
      )}
    >
      {prefix && <span className="mr-0.5">{prefix}</span>}
      {value}
      {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground font-sans">{suffix}</span>}
    </span>
  );
}

/**
 * Standard ORA Tabular Number for tables, badges, subtext (Inter + Tabular Nums)
 */
export function NumberText({
  children,
  className,
  weight = 'normal',
}: {
  children: React.ReactNode;
  className?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}) {
  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  return (
    <span
      className={cn(
        'tabular-nums tracking-tight',
        weightClasses[weight],
        className,
      )}
    >
      {children}
    </span>
  );
}
