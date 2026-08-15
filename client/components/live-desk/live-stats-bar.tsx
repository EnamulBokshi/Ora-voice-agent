'use client';

import {
  MessageSquare,
  Mic,
  Search,
  ShoppingCart,
  ReceiptText,
} from 'lucide-react';
import type { LiveStatsResponse } from '@/services/live-desk-service';

interface LiveStatsBarProps {
  stats?: LiveStatsResponse | null;
}

export function LiveStatsBar({ stats }: LiveStatsBarProps) {
  const statItems = [
    {
      label: 'Active Convos',
      icon: <MessageSquare size={16} />,
      colorClass: 'text-primary',
      value: stats?.activeConvos ?? 0,
      delta: '+0',
      neutral: true,
    },
    {
      label: 'Voice Sessions',
      icon: <Mic size={16} />,
      colorClass: 'text-[color:var(--chart-2)]',
      value: stats?.activeVoiceCalls ?? 0,
      delta: '+0',
      neutral: true,
    },
    {
      label: 'Product Searches',
      icon: <Search size={16} />,
      colorClass: 'text-[color:var(--chart-3)]',
      value: stats?.productSearches ?? 0,
      delta: stats?.productSearchesDelta ?? '+0',
      neutral: false,
    },
    {
      label: 'Cart Actions',
      icon: <ShoppingCart size={16} />,
      colorClass: 'text-[color:var(--status-online)]',
      value: stats?.cartActions ?? 0,
      delta: stats?.cartActionsDelta ?? '+0',
      neutral: false,
    },
    {
      label: 'Orders Influenced',
      icon: <ReceiptText size={16} />,
      colorClass: 'text-[color:var(--chart-4)]',
      value: stats?.ordersInfluenced ?? 0,
      delta: stats?.ordersInfluencedDelta ?? '+0',
      neutral: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
      {statItems.map((stat) => (
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
              {stat.value}
            </span>
            {!stat.neutral && stat.delta && stat.delta !== '+0' && stat.delta !== '0' ? (
              <span
                className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                  stat.delta.startsWith('-')
                    ? 'text-[color:var(--status-error)]'
                    : 'text-[color:var(--status-online)]'
                }`}
              >
                {stat.delta.startsWith('-') ? '↓' : '↑'} {stat.delta.replace(/[+-]/, '')}
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

