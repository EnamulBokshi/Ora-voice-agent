'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  DollarSign,
  MessageSquareText,
  Package,
  Percent,
  Radio,
  BookOpen,
  TrendingUp,
  ArrowRight,
  X,
  Compass,
} from 'lucide-react';
import {
  getDashboardStatsApi,
  DashboardStatsResponse,
} from '@/services/dashboard-service';
import { demoProfile, demoDashboardStats } from '@/lib/demo-data';
import { DEMO_MODE_ENABLED } from '@/lib/demo-config';
import { formatCurrency } from '@/lib/format';
import { getMeApi } from '@/services/auth-service';
import { toggleWidgetStatusApi } from '@/services/business-service';
import { useSetupProgress } from '@/hooks/use-setup-progress';

// ── Reusable components ──────────────────────────────────────────────────────
import { TopHeader } from '@/components/dashboard/top-header';
import { StatusStrip } from './status-strip';
import { AnalyticsPanel } from './analytics-panel';
import { QuickActionsBar, QuickAction } from './quick-actions-bar';
import { KpiCardDef } from './kpi-strip';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const EMPTY_STATS: DashboardStatsResponse = {
  productTotal: 0,
  orderTotal: 0,
  conversationTotal: 0,
  activeChats: 0,
  activeVoiceCalls: 0,
  totalRevenue: 0,
  revenueTrend: '+0.0%',
  ordersTrend: '+0.0%',
  conversationsTrend: '+0.0%',
  planName: null,
  planStatus: null,
  revenueTimeseries: { daily: [], weekly: [], growthRate: '+0.0%', totalRevenue: 0 },
  funnel: [],
  overallConversion: 0,
  recentOrders: [],
  recentConversations: [],
};

// ─── Component ───────────────────────────────────────────────────────────────

export function OverviewClient() {
  const [stats, setStats] = useState<DashboardStatsResponse>(
    DEMO_MODE_ENABLED ? demoDashboardStats : EMPTY_STATS,
  );
  const [, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(
    DEMO_MODE_ENABLED ? demoProfile.user.name : '',
  );
  const [isWidgetActive, setIsWidgetActive] = useState<boolean>(
    demoProfile.business?.isWidgetActive !== false,
  );
  const [isTogglingWidget, setIsTogglingWidget] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { completedCount, totalSteps, isAllCompleted } = useSetupProgress();

  const handleToggleWidget = async () => {
    const next = !isWidgetActive;
    setIsWidgetActive(next);
    setIsTogglingWidget(true);
    try {
      const res = await toggleWidgetStatusApi(next);
      setIsWidgetActive(res.business?.isWidgetActive !== false);
    } catch {
      setIsWidgetActive(!next);
    } finally {
      setIsTogglingWidget(false);
    }
  };

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else if (!DEMO_MODE_ENABLED && stats.productTotal === 0) setLoading(true);
    setError(null);

    try {
      const [data, me] = await Promise.allSettled([
        getDashboardStatsApi(),
        getMeApi(),
      ]);

      if (me.status === 'fulfilled' && me.value?.user?.name) {
        setUserName(me.value.user.name);
        if (me.value?.business) {
          setIsWidgetActive(me.value.business.isWidgetActive !== false);
        }
      } else if (DEMO_MODE_ENABLED) {
        setUserName(demoProfile.user.name);
      }

      if (data.status === 'fulfilled' && data.value) {
        const d = data.value;
        const isBackendEmpty =
          (!d.totalRevenue || d.totalRevenue === 0) &&
          (!d.orderTotal || d.orderTotal === 0);

        if (DEMO_MODE_ENABLED && isBackendEmpty) {
          setStats(demoDashboardStats);
        } else {
          setStats({
            productTotal: d.productTotal ?? 0,
            orderTotal: d.orderTotal ?? 0,
            conversationTotal: d.conversationTotal ?? 0,
            activeChats: d.activeChats ?? 0,
            activeVoiceCalls: d.activeVoiceCalls ?? 0,
            totalRevenue: d.totalRevenue ?? 0,
            revenueTrend: d.revenueTrend || '+0.0%',
            ordersTrend: d.ordersTrend || '+0.0%',
            conversationsTrend: d.conversationsTrend || '+0.0%',
            planName: d.planName ?? null,
            planStatus: d.planStatus ?? null,
            revenueTimeseries:
              d.revenueTimeseries ?? {
                daily: [],
                weekly: [],
                growthRate: '+0.0%',
                totalRevenue: 0,
              },
            funnel: d.funnel ?? [],
            overallConversion: d.overallConversion ?? 0,
            recentOrders: d.recentOrders ?? [],
            recentConversations: d.recentConversations ?? [],
          });
        }
      } else if (DEMO_MODE_ENABLED) {
        setStats(demoDashboardStats);
      } else {
        setStats(EMPTY_STATS);
      }
    } catch (err) {
      if (DEMO_MODE_ENABLED) {
        setStats(demoDashboardStats);
        setError(null);
      } else {
        setStats(EMPTY_STATS);
        setError(
          err instanceof Error ? err.message : 'Could not load overview stats',
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stats.productTotal]);

  useEffect(() => {
    load();
  }, [load]);

  const pathname = usePathname();
  const prefix = pathname?.startsWith('/shopify') ? '/shopify' : '';
  const firstName = userName.split(' ')[0] || userName;

  // ── KPI metric definitions ─────────────────────────────────────────────────

  const kpiCards: KpiCardDef[] = [
    {
      id: 'revenue',
      label: 'Revenue Influenced',
      value: formatCurrency(stats.totalRevenue),
      icon: <DollarSign size={13} />,
      trend: stats.revenueTrend,
      meta: 'Direct checkout sales',
      href: `${prefix}/billing`,
    },
    {
      id: 'orders',
      label: 'Assisted Orders',
      value: stats.orderTotal.toLocaleString(),
      icon: <ShoppingCart size={13} />,
      trend: stats.ordersTrend,
      meta: 'Customer orders closed',
      href: `${prefix}/live-desk`,
    },
    {
      id: 'conversations',
      label: 'Total Conversations',
      value: stats.conversationTotal.toLocaleString(),
      icon: <MessageSquareText size={13} />,
      trend: stats.conversationsTrend,
      meta: 'Voice & chat sessions',
      href: `${prefix}/conversations`,
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      value: `${stats.overallConversion}%`,
      icon: <Percent size={13} />,
      meta: 'Sales funnel completion',
      href: `${prefix}/live-desk`,
    },
    {
      id: 'catalog',
      label: 'Catalog Items',
      value: stats.productTotal.toLocaleString(),
      icon: <Package size={13} />,
      meta: 'Active products in sync',
      href: `${prefix}/agent?role=products`,
    },
  ];

  // ── Quick action definitions for Capabilities block ────────────────────────

  const quickActions: QuickAction[] = [
    {
      id: 'qa-live',
      icon: <Radio size={16} />,
      label: 'Live Desk Telemetry',
      description: 'Monitor active voice calls, shopper waveforms, and live interventions.',
      href: `${prefix}/live-desk`,
    },
    {
      id: 'qa-train',
      icon: <BookOpen size={16} />,
      label: 'ORA Agent & Catalog',
      description: 'Manage store policies, upload knowledge documents, and sync products.',
      href: `${prefix}/agent`,
    },
    {
      id: 'qa-history',
      icon: <TrendingUp size={16} />,
      label: 'Conversation Intelligence',
      description: 'Search customer transcripts, review buying signals, and export logs.',
      href: `${prefix}/conversations`,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <TopHeader
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''}`}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[10.5px] font-bold tracking-wider uppercase bg-surface-high text-foreground border border-border/60 select-none">
            <span className="w-1.5 h-1.5 rounded-none bg-[color:var(--status-online)]" />
            Overview
          </span>
        }
        onRefresh={() => load(true)}
        isRefreshing={refreshing}
      />

      {/* Setup Guide Banner — minimal & crisp non-rounded */}
      {!isAllCompleted && !bannerDismissed && (
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 bg-surface-lowest border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-5 h-5 rounded-none bg-surface-high flex items-center justify-center border border-border/50 text-foreground flex-shrink-0">
              <Compass size={12} className="text-foreground dark:text-[#C8F031]" />
            </div>
            <span className="text-[12.5px] text-foreground font-medium truncate">
              Store setup in progress ({completedCount}/{totalSteps} steps completed) —{' '}
              <Link
                href="/setup"
                className="font-semibold text-foreground dark:text-[#C8F031] underline underline-offset-4 hover:opacity-80 inline-flex items-center gap-1"
              >
                Complete Setup Guide
                <ArrowRight size={11} />
              </Link>
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss banner"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main Canvas — Minimized side margins (px-4 sm:px-6) and non-rounded flat layout */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="w-full px-4 sm:px-6 py-5 space-y-6">

          {/* ── Status Bar ── */}
          <StatusStrip
            activeConversations={stats.activeChats}
            voiceSessions={stats.activeVoiceCalls}
            productsCount={stats.productTotal}
            isWidgetActive={isWidgetActive}
            onToggleWidget={handleToggleWidget}
            isTogglingWidget={isTogglingWidget}
          />

          {/* ── Unified Block 1: Store Performance (Flat Strip + Chart) ── */}
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

          {/* ── Capabilities & Quick Jump Rows ── */}
          <QuickActionsBar actions={quickActions} />

        </div>
      </div>
    </div>
  );
}
