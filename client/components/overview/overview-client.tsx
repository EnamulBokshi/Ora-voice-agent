'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Package,
  ShoppingCart,
  MessageSquareText,
  CreditCard,
  ArrowRight,
  BookOpen,
  Radio,
  TrendingUp,
} from 'lucide-react';
import { getDashboardStatsApi } from '@/services/dashboard-service';
import { Order } from '@/services/orders-service';
import { Conversation } from '@/services/conversations-service';
import { demoOrders, demoConversations, demoProfile } from '@/lib/demo-data';
import { formatCurrency } from '@/lib/format';
import { getMeApi } from '@/services/auth-service';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OverviewStats {
  productTotal: number;
  orderTotal: number;
  conversationTotal: number;
  planName: string | null;
  planStatus: string | null;
  recentOrders: Order[];
  recentConversations: Conversation[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function channelLabel(raw: string): string {
  return raw.replace('widget_', '').replace(/_/g, ' ');
}

const orderStatusConfig: Record<string, { bg: string; text: string }> = {
  confirmed:  { bg: 'bg-[color:var(--status-online)]/10',   text: 'text-[color:var(--status-online)]' },
  pending:    { bg: 'bg-[color:var(--status-warning)]/10',  text: 'text-[color:var(--status-warning)]' },
  shipped:    { bg: 'bg-[color:var(--status-processing)]/10', text: 'text-[color:var(--status-processing)]' },
  delivered:  { bg: 'bg-[color:var(--status-active)]/10',   text: 'text-[color:var(--status-active)]' },
  canceled:   { bg: 'bg-[color:var(--status-error)]/10',    text: 'text-[color:var(--status-error)]' },
};

const convStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  active:     { bg: 'bg-[color:var(--status-active)]/10',   text: 'text-[color:var(--status-active)]',   label: 'Active' },
  ended:      { bg: 'bg-surface-high',                       text: 'text-muted-foreground',               label: 'Ended' },
  escalated:  { bg: 'bg-[color:var(--status-error)]/10',    text: 'text-[color:var(--status-error)]',    label: 'Escalated' },
  idle:       { bg: 'bg-surface-high',                       text: 'text-muted-foreground',               label: 'Idle' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function OverviewClient() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, me] = await Promise.allSettled([
        getDashboardStatsApi(),
        getMeApi(),
      ]);

      if (me.status === 'fulfilled') {
        setUserName(me.value?.user?.name ?? demoProfile.user.name);
      } else {
        setUserName(demoProfile.user.name);
      }

      if (data.status === 'fulfilled') {
        const d = data.value;
        setStats({
          productTotal: d.productTotal ?? 0,
          orderTotal: d.orderTotal ?? 0,
          conversationTotal: d.conversationTotal ?? 0,
          planName: d.planName ?? null,
          planStatus: d.planStatus ?? null,
          recentOrders: d.recentOrders?.length > 0 ? d.recentOrders : demoOrders,
          recentConversations:
            d.recentConversations?.length > 0 ? d.recentConversations : demoConversations,
        });
      } else {
        throw new Error('Could not load overview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-sm font-medium">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-sm text-muted-foreground px-6">
        {error ?? 'Dashboard unavailable.'}
      </div>
    );
  }

  const firstName = userName.split(' ')[0] || userName;

  const statCards = [
    {
      label: 'Orders via ORA',
      value: stats.orderTotal.toLocaleString(),
      icon: <ShoppingCart size={16} />,
      meta: 'ORA-assisted orders',
      href: '/live-desk',
    },
    {
      label: 'Products ORA knows',
      value: stats.productTotal.toLocaleString(),
      icon: <Package size={16} />,
      meta: 'Items in your catalog',
      href: '/agent',
    },
    {
      label: 'Shopper conversations',
      value: stats.conversationTotal.toLocaleString(),
      icon: <MessageSquareText size={16} />,
      meta: 'Total sessions handled',
      href: '/conversations',
    },
    {
      label: 'Your plan',
      value: stats.planName ?? 'Free',
      icon: <CreditCard size={16} />,
      meta: stats.planStatus
        ? stats.planStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        : 'Active',
      href: '/billing',
    },
  ];

  const quickActions = [
    {
      id: 'qa-live',
      icon: <Radio size={16} />,
      label: 'Watch ORA live',
      description: 'See every shopper conversation in real time.',
      href: '/live-desk',
    },
    {
      id: 'qa-train',
      icon: <BookOpen size={16} />,
      label: 'Feed your agent',
      description: 'Teach ORA your business info, products, and documents.',
      href: '/agent',
    },
    {
      id: 'qa-growth',
      icon: <TrendingUp size={16} />,
      label: 'Review conversations',
      description: 'See what shoppers asked and how ORA responded.',
      href: '/conversations',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 w-full">
      <div className="max-w-[1200px] mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Dashboard
          </p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Here's how ORA is performing for your store.
          </p>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key metrics">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-md border border-border bg-surface-container p-4 hover:bg-surface-high transition-colors block"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
                <span className="text-muted-foreground group-hover:text-primary transition-colors">
                  {card.icon}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                {card.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">{card.meta}</p>
            </Link>
          ))}
        </section>

        {/* ── Quick actions ───────────────────────────────────────────── */}
        <section aria-label="Quick actions">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                id={action.id}
                href={action.href}
                className="group flex items-start gap-3 rounded-md border border-border bg-surface-container p-4 hover:bg-surface-high hover:border-primary/30 transition-colors"
              >
                <span className="mt-0.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
                  {action.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                    {action.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                    {action.description}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="ml-auto flex-shrink-0 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-0.5"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Recent sales ────────────────────────────────────────────── */}
        <section aria-label="Recent sales">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-foreground">Recent sales</h2>
          </div>
          {stats.recentOrders.length === 0 ? (
            <div className="rounded-md border border-border bg-surface-container px-5 py-8 text-center">
              <p className="text-[13px] text-muted-foreground">
                No orders yet.{' '}
                <Link href="/agent" className="text-primary hover:underline">
                  Configure ORA
                </Link>{' '}
                to start handling shoppers.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-surface-container overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Order
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Total
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => {
                    const sc = orderStatusConfig[order.status] ?? orderStatusConfig.pending;
                    return (
                      <tr
                        key={order._id}
                        className="border-b border-border last:border-0 hover:bg-surface-high transition-colors"
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold capitalize ${sc.bg} ${sc.text}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Recent conversations ────────────────────────────────────── */}
        <section aria-label="Recent conversations">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-foreground">Recent conversations</h2>
            <Link
              href="/conversations"
              className="text-[12px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {stats.recentConversations.length === 0 ? (
            <div className="rounded-md border border-border bg-surface-container px-5 py-8 text-center">
              <p className="text-[13px] text-muted-foreground">
                No conversations yet. Once shoppers use your ORA widget, sessions appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-surface-container overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Session
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Channel
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Last active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentConversations.map((conv) => {
                    const cs =
                      convStatusConfig[conv.status] ?? convStatusConfig.ended;
                    return (
                      <tr
                        key={conv._id}
                        className="border-b border-border last:border-0 hover:bg-surface-high transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-[12px] text-foreground">
                          {conv.sessionId.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block rounded px-2 py-0.5 text-[11px] font-medium bg-surface-high text-muted-foreground capitalize">
                            {channelLabel(conv.channel)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cs.bg} ${cs.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cs.bg.replace('/10', '')} opacity-80`} />
                            {cs.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {new Date(
                            conv.lastActivityAt || conv.createdAt,
                          ).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
