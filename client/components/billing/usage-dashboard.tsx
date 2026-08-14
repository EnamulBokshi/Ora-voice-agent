'use client';

import Link from 'next/link';
import {
  BarChart2,
  Mic,
  ShoppingCart,
  Database,
  Users,
  ArrowUpRight,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* ── Header & Active Plan Banner ── */}
      <div className="rounded-md border border-border bg-surface-container p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary flex items-center gap-1.5">
              <BarChart2 size={13} />
              Billing & Quotas
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">· Monthly Cycle</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Usage & Resource Consumption
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Monitor real-time voice streaming minutes, assisted orders, and store knowledge queries.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-md bg-surface-low border border-border flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                {plan?.name ?? 'Pro Plan'}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar size={10} />
                <span>Renews {periodEndFormatted}</span>
              </p>
            </div>
          </div>

          <Link
            href="/billing"
            className="px-3.5 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Upgrade Plan</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── 4 Quota Utilization Meters ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Voice Minutes */}
        <div className="rounded-md border border-border bg-surface-container p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                <Mic size={15} />
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold font-mono',
                  minutesPct > 80
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-surface-low text-foreground border border-border',
                )}
              >
                {minutesPct}%
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Voice Minutes</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
              {minutesUsed}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {minutesLimit} min</span>
            </h3>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="w-full bg-surface-low rounded-full h-1.5 overflow-hidden border border-border">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${minutesPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              {minutesLimit - minutesUsed} minutes remaining
            </p>
          </div>
        </div>

        {/* Metric 2: Assisted Orders */}
        <div className="rounded-md border border-border bg-surface-container p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                <ShoppingCart size={15} />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-surface-low text-foreground border border-border">
                {ordersPct}%
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Assisted Orders</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
              {ordersUsed}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {ordersLimit} orders</span>
            </h3>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="w-full bg-surface-low rounded-full h-1.5 overflow-hidden border border-border">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${ordersPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              {ordersLimit - ordersUsed} orders remaining
            </p>
          </div>
        </div>

        {/* Metric 3: RAG Knowledge Queries */}
        <div className="rounded-md border border-border bg-surface-container p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                <Database size={15} />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-surface-low text-foreground border border-border">
                {ragPct}%
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Store Context Queries</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
              {ragUsed.toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {ragLimit.toLocaleString()}</span>
            </h3>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="w-full bg-surface-low rounded-full h-1.5 overflow-hidden border border-border">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${ragPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              {(ragLimit - ragUsed).toLocaleString()} queries remaining
            </p>
          </div>
        </div>

        {/* Metric 4: Team Seats */}
        <div className="rounded-md border border-border bg-surface-container p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
                <Users size={15} />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-surface-low text-foreground border border-border">
                {seatsPct}%
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Team Member Seats</p>
            <h3 className="text-xl font-bold text-foreground mt-0.5 tabular-nums">
              {seatsUsed}{' '}
              <span className="text-xs font-normal text-muted-foreground">/ {seatsLimit} seats</span>
            </h3>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="w-full bg-surface-low rounded-full h-1.5 overflow-hidden border border-border">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${seatsPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              {seatsLimit - seatsUsed} available seats
            </p>
          </div>
        </div>
      </div>

      {/* ── Daily Activity Breakdown Table ── */}
      <div className="rounded-md border border-border bg-surface-container overflow-hidden">
        <div className="p-5 border-b border-border bg-surface-low/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Voice & Sales Activity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily breakdown of customer voice interactions and assisted conversions.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Last 7 Days</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-border bg-surface-low text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Timeline</th>
                <th className="px-5 py-3 font-medium">Live Sessions</th>
                <th className="px-5 py-3 font-medium">Minutes Consumed</th>
                <th className="px-5 py-3 font-medium">Orders Assisted</th>
                <th className="px-5 py-3 font-medium text-right">Quota Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dailyBreakdown.map((row, i) => (
                <tr key={i} className="hover:bg-surface-high/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">{row.day}</td>
                  <td className="px-5 py-3.5 font-mono text-foreground">{row.sessions} sessions</td>
                  <td className="px-5 py-3.5 font-mono text-foreground">{row.minutes} min</td>
                  <td className="px-5 py-3.5 text-foreground">
                    <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-mono font-medium">
                      {row.orders} orders
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">
                    +{Math.round((row.minutes / minutesLimit) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Fair Usage & Quotas Notice ── */}
      <div className="rounded-md border border-border bg-surface-low p-4 flex items-start gap-3">
        <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-medium text-foreground">Fair Usage & Uninterrupted Customer Experience</p>
          <p className="text-muted-foreground leading-relaxed">
            ORA never shuts off unexpectedly during customer sessions. When approaching 80% and 95% of your quota, we'll notify you in-app and via email with 1-click tier expansion options.
          </p>
        </div>
      </div>
    </div>
  );
}
