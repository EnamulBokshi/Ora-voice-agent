'use client';

import { SubscriptionDetailsResponse } from '@/types/billing';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';

interface UsageDashboardProps {
  subscription: SubscriptionDetailsResponse;
}

export function UsageDashboard({ subscription }: UsageDashboardProps) {
  const plan = subscription.plan;
  const sub = subscription.subscription;
  const usage = subscription.usage;

  const limits = plan?.limits ?? {
    conversationMinutes: 100,
    ordersPerMonth: 25,
    connectedStores: 1,
  };

  const minutesUsed = usage.conversationMinutes ?? 0;
  const minutesLimit = limits.conversationMinutes || 100;
  const minutesPct = Math.min(100, Math.round((minutesUsed / Math.max(1, minutesLimit)) * 100));

  const ordersUsed = usage.ordersPerMonth ?? 0;
  const ordersLimit = limits.ordersPerMonth || 25;
  const ordersPct = Math.min(100, Math.round((ordersUsed / Math.max(1, ordersLimit)) * 100));

  const storesUsed = usage.connectedStores ?? 0;
  const storesLimit = limits.connectedStores || 1;
  const storesPct = Math.min(100, Math.round((storesUsed / Math.max(1, storesLimit)) * 100));

  const periodEndFormatted = sub?.currentPeriodEnd
    ? formatDateTime(sub.currentPeriodEnd)
    : 'Monthly cycle';

  const daysLabel = ['Today', 'Yesterday', '2 days ago', '3 days ago', '4 days ago', '5 days ago', '6 days ago'];
  const dailyBreakdown = daysLabel.map((day, idx) => ({
    day,
    sessions: idx === 0 ? (minutesUsed > 0 ? 1 : 0) : 0,
    minutes: idx === 0 ? minutesUsed : 0,
    orders: idx === 0 ? ordersUsed : 0,
  }));

  const quotaItems = [
    {
      label: 'Conversation Minutes',
      used: minutesUsed,
      limit: minutesLimit,
      unit: 'min',
      pct: minutesPct,
      remaining: `${Math.max(0, minutesLimit - minutesUsed)} min remaining`,
    },
    {
      label: 'Assisted Orders',
      used: ordersUsed,
      limit: ordersLimit,
      unit: 'orders',
      pct: ordersPct,
      remaining: `${Math.max(0, ordersLimit - ordersUsed)} orders remaining`,
    },
    {
      label: 'Connected Stores',
      used: storesUsed,
      limit: storesLimit,
      unit: 'store',
      pct: storesPct,
      remaining: `${Math.max(0, storesLimit - storesUsed)} available`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Quota Utilization Card ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              Active Resource Quota Utilization
            </h2>
          </div>
          <span className="text-[11.5px] font-mono text-muted-foreground">
            {sub?.status === 'active' ? `Renews on ${periodEndFormatted}` : 'Active Free Tier'}
          </span>
        </div>

        {/* 3-Column Flat Metric Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/40 rounded-md overflow-hidden border border-border/40">
          {quotaItems.map((item) => (
            <div key={item.label} className="bg-background p-4 sm:p-5 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
                  {item.label}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  {item.pct}%
                </span>
              </div>

              <div>
                <span className="text-2xl lg:text-[28px] font-semibold text-foreground font-serif tabular-nums leading-none tracking-tight">
                  {item.used.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  / {item.limit.toLocaleString()} {item.unit}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-surface-high overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      item.pct > 85 ? 'bg-amber-400' : 'bg-primary',
                    )}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/80 font-mono">
                  {item.remaining}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Daily Activity Breakdown Card ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <h3 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              Daily Voice & Order Activity
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Trailing 7-Day Window
          </span>
        </div>

        <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
          <table className="w-full min-w-[480px] text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground uppercase text-[11px] font-mono font-medium tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Voice Sessions</th>
                <th className="py-2.5 px-3 text-right">Minutes Consumed</th>
                <th className="py-2.5 px-3 text-right">Orders Assisted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-foreground">
              {dailyBreakdown.map((row) => (
                <tr key={row.day} className="hover:bg-surface-high/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-foreground text-[12.5px]">
                    {row.day}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                    {row.sessions}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-foreground font-medium">
                    {row.minutes} min
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">
                    {row.orders}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
