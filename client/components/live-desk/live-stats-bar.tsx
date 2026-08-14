'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Mic,
  Search,
  ShoppingCart,
  ReceiptText,
} from 'lucide-react';

interface Stat {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  base: number;
  delta: number;
  neutral?: boolean;
}

const STATS: Stat[] = [
  { label: 'Active Convos', icon: <MessageSquare size={16} />, colorClass: 'text-primary', base: 12, delta: 3 },
  { label: 'Voice Sessions', icon: <Mic size={16} />, colorClass: 'text-[color:var(--chart-2)]', base: 8, delta: 2 },
  { label: 'Product Searches', icon: <Search size={16} />, colorClass: 'text-[color:var(--chart-3)]', base: 34, delta: 12 },
  { label: 'Cart Actions', icon: <ShoppingCart size={16} />, colorClass: 'text-[color:var(--status-online)]', base: 17, delta: 5 },
  { label: 'Orders Influenced', icon: <ReceiptText size={16} />, colorClass: 'text-[color:var(--chart-4)]', base: 6, delta: 0, neutral: true },
];

interface LiveStatsBarProps {
  paused: boolean;
}

export function LiveStatsBar({ paused }: LiveStatsBarProps) {
  const [values, setValues] = useState<number[]>(STATS.map((s) => s.base));

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setValues((prev) =>
        prev.map((v, i) => {
          if (STATS[i].neutral) return v;
          return Math.random() > 0.65 ? v + 1 : v;
        })
      );
    }, 3500);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className="rounded-md border border-border bg-surface-container p-3.5 flex flex-col justify-between transition-all hover:border-border/80"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
            <span className={stat.colorClass}>{stat.icon}</span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {values[i]}
            </span>
            {stat.delta > 0 ? (
              <span className="text-[11px] font-semibold text-[color:var(--status-online)] flex items-center gap-0.5">
                ↑ {stat.delta}{stat.label === 'Product Searches' ? '%' : ''}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground">— 0</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
