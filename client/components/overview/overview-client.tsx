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
  DollarSign,
} from 'lucide-react';
import { getDashboardStatsApi } from '@/services/dashboard-service';
import { Order } from '@/services/orders-service';
import { Conversation } from '@/services/conversations-service';
import { demoOrders, demoConversations, demoProfile } from '@/lib/demo-data';
import { formatCurrency } from '@/lib/format';
import { getMeApi } from '@/services/auth-service';
import { HeroStatusCard } from './hero-status-card';
import { RevenueChart } from './revenue-chart';
import { SalesFunnel } from './sales-funnel';

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
          <span className="text-sm font-medium">Loading overview...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-sm text-muted-foreground px-6">
        {error ?? 'Overview unavailable.'}
      </div>
    );
  }

  const firstName = userName.split(' ')[0] || userName;

  const statCards = [
    {
      label: 'Assisted Orders',
      value: stats.orderTotal.toLocaleString(),
      icon: <ShoppingCart size={16} />,
      trend: '+12.4%',
      meta: 'Converted orders',
      href: '/live-desk',
    },
    {
      label: 'Revenue Influenced',
      value: '$24,820',
      icon: <DollarSign size={16} />,
      trend: '+18.4%',
      meta: 'Direct checkout sales',
      href: '/billing',
    },
    {
      label: 'Conversations',
      value: stats.conversationTotal.toLocaleString(),
      icon: <MessageSquareText size={16} />,
      trend: '+8.1%',
      meta: 'Customer interactions',
      href: '/conversations',
    },
    {
      label: 'Catalog Items',
      value: stats.productTotal.toLocaleString(),
      icon: <Package size={16} />,
      meta: 'Available products',
      href: '/agent',
    },
    {
      label: 'Plan Tier',
      value: stats.planName ?? 'Growth',
      icon: <CreditCard size={16} />,
      meta: stats.planStatus
        ? stats.planStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        : 'Active Subscription',
      href: '/billing',
    },
  ];

  const quickActions = [
    {
      id: 'qa-live',
      icon: <Radio size={16} />,
      label: 'Live Desk',
      description: 'Monitor active conversations and voice sessions in real time.',
      href: '/live-desk',
    },
    {
      id: 'qa-train',
      icon: <BookOpen size={16} />,
      label: 'Store & Catalog Setup',
      description: 'Manage store policies, products, and support guidelines.',
      href: '/agent',
    },
    {
      id: 'qa-growth',
      icon: <TrendingUp size={16} />,
      label: 'Conversation History',
      description: 'Review transcripts, customer questions, and responses.',
      href: '/conversations',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 w-full bg-background">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* ── Top Header ──────────────────────────────────────────────── */}
        <div className="pb-2 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
            Store Performance
          </p>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>

        {/* ── Row 1: Hero Store Status Card ───────────────────────────── */}
        <HeroStatusCard
          activeConversations={12}
          voiceSessions={3}
          productsCount={stats.productTotal || 412}
        />

        {/* ── Row 2: Key Metric Cards ──────────────────────────────────── */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5" aria-label="Key performance indicators">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-md border border-border bg-surface-container p-4 hover:border-border/80 hover:bg-surface-high transition-colors block"
            >
              <div className="flex items-center justify-between text-muted-foreground mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.label}
                </span>
                <span className="text-muted-foreground group-hover:text-primary transition-colors">
                  {card.icon}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                  {card.value}
                </p>
                {card.trend && (
                  <span className="text-[10px] font-bold text-[color:var(--status-online)]">
                    {card.trend}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 truncate">{card.meta}</p>
            </Link>
          ))}
        </section>

        {/* ── Row 3: Revenue & Funnel Analytics ────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Revenue Chart (7 cols) */}
          <div className="xl:col-span-7">
            <RevenueChart />
          </div>

          {/* Sales Funnel (5 cols) */}
          <div className="xl:col-span-5">
            <SalesFunnel />
          </div>
        </div>

        {/* ── Row 4: Quick Action Shortcuts ───────────────────────────── */}
        <section aria-label="Quick actions" className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                id={action.id}
                href={action.href}
                className="group flex items-start gap-3.5 rounded-md border border-border bg-surface-container p-4 hover:bg-surface-high hover:border-primary/40 transition-all"
              >
                <div className="p-2 rounded-md bg-surface-low border border-border/80 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">
                    {action.label}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                    {action.description}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="ml-auto flex-shrink-0 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Row 5: Recent Sales & Conversations ─────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Recent Orders Table */}
          <section aria-label="Recent sales" className="rounded-md border border-border bg-surface-container overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-primary" />
                <h2 className="text-[13px] font-semibold text-foreground">Recent Orders</h2>
              </div>
              <Link
                href="/live-desk"
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                Live desk <ArrowRight size={11} />
              </Link>
            </div>

            {stats.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No orders yet. Recent orders will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Order</th>
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">Amount</th>
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.slice(0, 5).map((order) => {
                      const sc = orderStatusConfig[order.status] ?? orderStatusConfig.pending;
                      return (
                        <tr
                          key={order._id}
                          className="border-b border-border last:border-0 hover:bg-surface-high/60 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium text-foreground font-mono">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold capitalize ${sc.bg} ${sc.text}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-foreground font-semibold">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground font-mono text-[11px]">
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

          {/* Recent Conversations Table */}
          <section aria-label="Recent conversations" className="rounded-md border border-border bg-surface-container overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareText size={15} className="text-primary" />
                <h2 className="text-[13px] font-semibold text-foreground">Recent Conversations</h2>
              </div>
              <Link
                href="/conversations"
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                All sessions <ArrowRight size={11} />
              </Link>
            </div>

            {stats.recentConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No conversations yet. Customer sessions will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Session</th>
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Channel</th>
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentConversations.slice(0, 5).map((conv) => {
                      const cs = convStatusConfig[conv.status] ?? convStatusConfig.ended;
                      return (
                        <tr
                          key={conv._id}
                          className="border-b border-border last:border-0 hover:bg-surface-high/60 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-mono text-[11px] text-foreground">
                            {conv.sessionId.slice(0, 10)}…
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-block rounded px-2 py-0.5 text-[10px] font-medium bg-surface-high text-muted-foreground capitalize">
                              {channelLabel(conv.channel)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cs.bg} ${cs.text}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                              {cs.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground font-mono text-[11px]">
                            {new Date(conv.lastActivityAt || conv.createdAt).toLocaleDateString()}
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
    </div>
  );
}
