'use client';

import { SubscriptionDetailsResponse } from '@/types/billing';
import { cn } from '@/lib/utils';

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
    seats: 3,
  };

  const minutesUsed = usage.conversationMinutes ?? 47;
  const minutesLimit = limits.conversationMinutes || 100;
  const minutesPct = Math.min(100, Math.round((minutesUsed / minutesLimit) * 100));

  const ordersUsed = usage.ordersPerMonth ?? 14;
  const ordersLimit = limits.ordersPerMonth || 25;
  const ordersPct = Math.min(100, Math.round((ordersUsed / ordersLimit) * 100));

  const ragUsed = 1420;
  const ragLimit = 5000;
  const ragPct = Math.min(100, Math.round((ragUsed / ragLimit) * 100));

  const seatsUsed = 1;
  const seatsLimit = limits.seats || 3;
  const seatsPct = Math.min(100, Math.round((seatsUsed / seatsLimit) * 100));

  const periodEndFormatted = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Sep 1, 2026';

  const dailyBreakdown = [
    { day: 'Today', sessions: 8, minutes: 12.4, orders: 4 },
    { day: 'Yesterday', sessions: 11, minutes: 18.2, orders: 5 },
    { day: '2 days ago', sessions: 6, minutes: 9.1, orders: 2 },
    { day: '3 days ago', sessions: 9, minutes: 14.0, orders: 3 },
    { day: '4 days ago', sessions: 4, minutes: 6.8, orders: 1 },
    { day: '5 days ago', sessions: 7, minutes: 10.5, orders: 2 },
    { day: '6 days ago', sessions: 5, minutes: 7.2, orders: 1 },
  ];

  const quotaItems = [
    {
      label: 'Conversation Minutes',
      used: minutesUsed,
      limit: minutesLimit,
      unit: 'min',
      pct: minutesPct,
      remaining: `${minutesLimit - minutesUsed} min remaining`,
    },
    {
      label: 'Assisted Orders',
      used: ordersUsed,
      limit: ordersLimit,
      unit: 'orders',
      pct: ordersPct,
      remaining: `${ordersLimit - ordersUsed} orders remaining`,
    },
    {
      label: 'Store Knowledge Queries',
      used: ragUsed,
      limit: ragLimit,
      unit: '',
      pct: ragPct,
      remaining: `${(ragLimit - ragUsed).toLocaleString()} remaining`,
    },
    {
      label: 'Team Seats',
      used: seatsUsed,
      limit: seatsLimit,
      unit: 'seats',
      pct: seatsPct,
      remaining: `${seatsLimit - seatsUsed} available`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Cycle Information ── */}
      <div className="flex items-center justify-between text-[12px] text-muted-foreground pb-1">
        <span>
          Current billing cycle for <strong className="text-foreground font-semibold">{plan?.name ?? 'Pro Plan'}</strong>
        </span>
        <span className="font-mono">Renews on {periodEndFormatted}</span>
      </div>

      {/* ── 4-Column Flat Metric Strip ── */}
      <div>
        <div className="pb-3 border-b border-border">
          <h2 className="text-[13.5px] font-semibold text-foreground">Quota Utilization</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border py-4">
          {quotaItems.map((item) => (
            <div key={item.label} className="p-4 first:pl-0 last:pr-0 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[12px] font-medium text-muted-foreground truncate">
                  {item.label}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {item.pct}%
                </span>
              </div>

              <div>
                <span className="text-2xl font-bold font-mono text-foreground tabular-nums">
                  {item.used.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  / {item.limit.toLocaleString()} {item.unit}
                </span>
              </div>

              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-surface-high overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      item.pct > 85 ? 'bg-amber-400' : 'bg-primary',
                    )}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <p className="text-[10.5px] text-muted-foreground/70 font-mono">
                  {item.remaining}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Flat Activity Breakdown Table ── */}
      <div className="pt-2">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-[13.5px] font-semibold text-foreground">Daily Activity Breakdown</h3>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Daily customer interactions and resource consumption over the last 7 days.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[11px] font-medium tracking-wider">
                <th className="py-2.5 px-3">Timeline</th>
                <th className="py-2.5 px-3">Sessions</th>
                <th className="py-2.5 px-3">Minutes Used</th>
                <th className="py-2.5 px-3">Orders Assisted</th>
                <th className="py-2.5 px-3 text-right">Quota Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-foreground">
              {dailyBreakdown.map((row, i) => (
                <tr key={i} className="hover:bg-surface-high/30 transition-colors">
                  <td className="py-3 px-3 font-medium text-foreground">{row.day}</td>
                  <td className="py-3 px-3 font-mono text-muted-foreground">{row.sessions} sessions</td>
                  <td className="py-3 px-3 font-mono text-foreground">{row.minutes} min</td>
                  <td className="py-3 px-3 font-mono text-foreground">{row.orders} orders</td>
                  <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                    +{Math.round((row.minutes / minutesLimit) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Policy Notice ── */}
      <div className="pt-2 text-[12px] text-muted-foreground border-t border-border flex items-center justify-between">
        <span>Fair usage policy applies. When reaching 80% quota, automatic notifications will be sent to the store email.</span>
      </div>
    </div>
  );
}
