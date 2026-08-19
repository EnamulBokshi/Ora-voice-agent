'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  DollarSign,
  MessageSquareText,
  Package,
  Percent,
  Radio,
  BookOpen,
  TrendingUp,
  Globe,
  ArrowRight,
  X,
  Loader2,
} from 'lucide-react';
import {
  getDashboardStatsApi,
  DashboardStatsResponse,
} from '@/services/dashboard-service';
import { demoOrders, demoConversations, demoProfile, demoDashboardStats } from '@/lib/demo-data';
import { withDemoFallback, DEMO_MODE_ENABLED } from '@/lib/demo-config';
import { formatCurrency } from '@/lib/format';
import { getMeApi } from '@/services/auth-service';

// ── Reusable components ──────────────────────────────────────────────────────
import { TopHeader }              from '@/components/dashboard/top-header';
import { StatusStrip }            from './status-strip';
import { AnalyticsPanel }         from './analytics-panel';
import { RecentActivityPanel }    from './recent-activity-panel';
import { QuickActionsBar, QuickAction } from './quick-actions-bar';
import { KpiCardDef }             from './kpi-strip';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OverviewClient() {
  const [stats, setStats]           = useState<DashboardStatsResponse>(demoDashboardStats);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [userName, setUserName]     = useState<string>(demoProfile.user.name);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    setError(null);

    try {
      const [data, me] = await Promise.allSettled([
        getDashboardStatsApi(),
        getMeApi(),
      ]);

      if (me.status === 'fulfilled' && me.value?.user?.name) {
        setUserName(me.value.user.name);
      } else if (DEMO_MODE_ENABLED) {
        setUserName(demoProfile.user.name);
      }

      if (data.status === 'fulfilled' && data.value) {
        const d = data.value;
        const isBackendEmpty = (!d.totalRevenue || d.totalRevenue === 0) && (!d.orderTotal || d.orderTotal === 0);

        if (DEMO_MODE_ENABLED && isBackendEmpty) {
          setStats(demoDashboardStats);
        } else {
          setStats({
            productTotal: d.productTotal ?? (DEMO_MODE_ENABLED ? demoDashboardStats.productTotal : 0),
            orderTotal: d.orderTotal ?? (DEMO_MODE_ENABLED ? demoDashboardStats.orderTotal : 0),
            conversationTotal: d.conversationTotal ?? (DEMO_MODE_ENABLED ? demoDashboardStats.conversationTotal : 0),
            activeChats: d.activeChats ?? (DEMO_MODE_ENABLED ? demoDashboardStats.activeChats : 0),
            activeVoiceCalls: d.activeVoiceCalls ?? (DEMO_MODE_ENABLED ? demoDashboardStats.activeVoiceCalls : 0),
            totalRevenue: d.totalRevenue ?? (DEMO_MODE_ENABLED ? demoDashboardStats.totalRevenue : 0),
            revenueTrend: d.revenueTrend || (DEMO_MODE_ENABLED ? demoDashboardStats.revenueTrend : '+0.0%'),
            ordersTrend: d.ordersTrend || (DEMO_MODE_ENABLED ? demoDashboardStats.ordersTrend : '+0.0%'),
            conversationsTrend: d.conversationsTrend || (DEMO_MODE_ENABLED ? demoDashboardStats.conversationsTrend : '+0.0%'),
            planName: d.planName ?? (DEMO_MODE_ENABLED ? demoDashboardStats.planName : null),
            planStatus: d.planStatus ?? (DEMO_MODE_ENABLED ? demoDashboardStats.planStatus : null),
            revenueTimeseries: (d.revenueTimeseries?.daily?.length)
              ? d.revenueTimeseries
              : (DEMO_MODE_ENABLED ? demoDashboardStats.revenueTimeseries : { daily: [], weekly: [], growthRate: '+0.0%', totalRevenue: 0 }),
            funnel: (d.funnel?.length)
              ? d.funnel
              : (DEMO_MODE_ENABLED ? demoDashboardStats.funnel : []),
            overallConversion: d.overallConversion ?? (DEMO_MODE_ENABLED ? demoDashboardStats.overallConversion : 0),
            recentOrders: (d.recentOrders?.length)
              ? d.recentOrders
              : (DEMO_MODE_ENABLED ? demoOrders : []),
            recentConversations: (d.recentConversations?.length)
              ? d.recentConversations
              : (DEMO_MODE_ENABLED ? demoConversations : []),
          });
        }
      } else if (DEMO_MODE_ENABLED) {
        setStats(demoDashboardStats);
      } else {
        throw new Error('Could not load overview stats');
      }
    } catch (err) {
      if (DEMO_MODE_ENABLED) {
        setStats(demoDashboardStats);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Could not load overview');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const firstName = userName.split(' ')[0] || userName;

  // ── KPI metric definitions matching Live Desk typography ───────────────────

  const kpiCards: KpiCardDef[] = [
    {
      id: 'orders',
      label: 'Assisted Orders',
      value: stats.orderTotal.toLocaleString(),
      icon: <ShoppingCart size={14} />,
      trend: stats.ordersTrend,
      meta: 'Converted orders',
      href: '/live-desk',
    },
    {
      id: 'revenue',
      label: 'Revenue Influenced',
      value: formatCurrency(stats.totalRevenue),
      icon: <DollarSign size={14} />,
      trend: stats.revenueTrend,
      meta: 'Direct checkout sales',
      href: '/billing',
    },
    {
      id: 'conversations',
      label: 'Conversations',
      value: stats.conversationTotal.toLocaleString(),
      icon: <MessageSquareText size={14} />,
      trend: stats.conversationsTrend,
      meta: 'Customer interactions',
      href: '/conversations',
    },
    {
      id: 'catalog',
      label: 'Catalog Items',
      value: stats.productTotal.toLocaleString(),
      icon: <Package size={14} />,
      meta: 'Active products in sync',
      href: '/agent?tab=products',
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      value: `${stats.overallConversion}%`,
      icon: <Percent size={14} />,
      meta: 'Funnel completion',
      href: '/live-desk',
    },
  ];

  // ── Quick action definitions for Setup block ───────────────────────────────

  const quickActions: QuickAction[] = [
    {
      id: 'qa-live',
      icon: <Radio size={15} />,
      label: 'Live Desk',
      description: 'Monitor active conversations and voice calls in real time.',
      href: '/live-desk',
    },
    {
      id: 'qa-train',
      icon: <BookOpen size={15} />,
      label: 'Store Knowledge & Catalog',
      description: 'Manage store policies, documents, and product catalog.',
      href: '/agent',
    },
    {
      id: 'qa-history',
      icon: <TrendingUp size={15} />,
      label: 'Conversation History',
      description: 'Review past customer transcripts and sales signals.',
      href: '/conversations',
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <TopHeader
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''}`}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-surface-high text-muted-foreground border border-border select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
            Overview
          </span>
        }
        onRefresh={() => load(true)}
        isRefreshing={refreshing}
      />

      {/* Onboarding banner — full-width strip, dismissible */}
      {stats.productTotal === 0 && !bannerDismissed && (
        <div className="flex items-center justify-between gap-4 px-6 py-2.5 bg-surface-high/60 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Globe size={13} className="text-muted-foreground flex-shrink-0" />
            <span className="text-[12.5px] text-foreground font-medium truncate">
              Your store has no products yet —{' '}
              <Link
                href="/agent?tab=products"
                className="font-semibold text-foreground hover:underline inline-flex items-center gap-1"
              >
                Import your product catalog
                <ArrowRight size={11} />
              </Link>
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss banner"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-6 space-y-6">

          {/* ── Status Bar ── */}
          <StatusStrip
            activeConversations={stats.activeChats}
            voiceSessions={stats.activeVoiceCalls}
            productsCount={stats.productTotal}
          />

          {/* ── Unified Block 1: Store Performance (Metrics + Chart) ── */}
          <AnalyticsPanel
            kpiCards={kpiCards}
            revenueProps={{
              daily: stats.revenueTimeseries?.daily,
              weekly: stats.revenueTimeseries?.weekly,
              growthRate: stats.revenueTrend,
              totalRevenue: stats.totalRevenue,
            }}
            funnelProps={{
              funnel: stats.funnel,
              overallConversion: stats.overallConversion,
            }}
          />

          {/* ── Unified Block 2: Recent Customer Activity (Split 2-col) ── */}
          <RecentActivityPanel
            orders={stats.recentOrders}
            conversations={stats.recentConversations}
          />

          {/* ── Unified Block 3: Store & Assistant Setup ── */}
          <QuickActionsBar actions={quickActions} />

        </div>
      </div>
    </div>
  );
}
