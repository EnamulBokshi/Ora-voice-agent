'use client';

import { useEffect, useState } from 'react';
import {
  MessageSquare, Mic, Search, ShoppingCart, ReceiptText,
} from 'lucide-react';

interface Stat {
  label:    string;
  icon:     React.ReactNode;
  iconVar:  string;
  base:     number;
  delta:    number;
  neutral?: boolean;
}

const STATS: Stat[] = [
  { label: 'Active Convos',     icon: <MessageSquare size={18} />, iconVar: 'var(--primary)',     base: 12, delta: 3  },
  { label: 'Voice Sessions',    icon: <Mic           size={18} />, iconVar: 'var(--secondary)',   base: 8,  delta: 2  },
  { label: 'Product Searches',  icon: <Search        size={18} />, iconVar: 'var(--chart-3)',     base: 34, delta: 12 },
  { label: 'Cart Actions',      icon: <ShoppingCart  size={18} />, iconVar: 'var(--ora-success)', base: 17, delta: 5  },
  { label: 'Orders Influenced', icon: <ReceiptText   size={18} />, iconVar: 'var(--chart-4)',     base: 6,  delta: 0, neutral: true },
];

interface LiveStatsBarProps {
  paused: boolean;
}

export function LiveStatsBar({ paused }: LiveStatsBarProps) {
  const [values, setValues] = useState(STATS.map((s) => s.base));

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setValues((prev) =>
        prev.map((v, i) => {
          if (STATS[i].neutral) return v;
          return Math.random() > 0.7 ? v + 1 : v;
        })
      );
    }, 3500);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className="rounded-xl p-4 flex flex-col gap-2"
          style={{
            background:     'var(--glass-bg)',
            border:         '1px solid var(--glass-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
            <span style={{ color: stat.iconVar }}>{stat.icon}</span>
          </div>
          <div className="flex items-end gap-2">
            <span
              className="text-3xl font-bold tabular-nums leading-none text-foreground transition-all duration-500"
            >
              {values[i]}
            </span>
            {stat.delta > 0 ? (
              <span
                className="text-xs font-semibold mb-0.5 flex items-center gap-0.5"
                style={{ color: 'var(--ora-success)' }}
              >
                ↑ {stat.delta}{stat.label === 'Product Searches' ? '%' : ''}
              </span>
            ) : (
              <span className="text-xs font-semibold mb-0.5 text-muted-foreground">— 0</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
