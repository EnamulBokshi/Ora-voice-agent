'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
  Loader2,
  SlidersHorizontal,
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
import { AppLink } from '@/components/navigation/app-link';
import { useAppBasePath } from '@/lib/navigation/app-path';

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
  // These were declared as `const [, setLoading]` / `const [, setError]`, discarding
  // both values. load() set them correctly all along, but nothing could render them —
  // so a failed getDashboardStatsApi() call showed $0 revenue, 0 orders and 0
  // conversations, which a merchant reads as a catastrophic sales day rather than a
  // fetch error.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(
    DEMO_MODE_ENABLED ? demoProfile.user.name : '',
  );
  // Seeded from demo data only when demo mode is on. Every other initial value on this
  // page already respects DEMO_MODE_ENABLED; this one read demoProfile unconditionally.
  const [isWidgetActive, setIsWidgetActive] = useState<boolean>(
    DEMO_MODE_ENABLED ? demoProfile.business?.isWidgetActive !== false : true,
  );
  const [isTogglingWidget, setIsTogglingWidget] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ora_setup_banner_dismissed') === 'true';
    }
    return false;
  });
  const { completedCount, totalSteps, isAllCompleted } = useSetupProgress();

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ora_setup_banner_dismissed', 'true');
    }
  };

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

  // Read through a ref so `load` keeps a stable identity. It previously depended on
  // stats.productTotal while `useEffect(() => load(), [load])` ran it, so every stats
  // update rebuilt the callback and triggered another fetch.
  const productTotalRef = useRef(stats.productTotal);
  productTotalRef.current = stats.productTotal;

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else if (!DEMO_MODE_ENABLED && productTotalRef.current === 0) setLoading(true);
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

      // Read outside the display-name guard: the storefront pause state must load even
      // for an account with no name set, or the header falls back to "Online".
      if (me.status === 'fulfilled' && me.value?.business) {
        setIsWidgetActive(me.value.business.isWidgetActive !== false);
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
        // The real silent-failure path: Promise.allSettled never throws, so a rejected
        // stats call landed here and zeroed every figure without reaching the catch
        // below. The merchant saw $0 with no explanation.
        setStats(EMPTY_STATS);
        setError(
          data.status === 'rejected' && data.reason instanceof Error
            ? data.reason.message
            : 'Could not load overview stats',
        );
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pathname = usePathname();
  const prefix = useAppBasePath();
  const firstName = userName.split(' ')[0] || userName;

  // ── KPI metric definitions with clear business attribution ─────────────────

  const kpiCards: KpiCardDef[] = [
    {
      id: 'revenue',
      label: 'Attributed Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: <DollarSign size={13} />,
      trend: stats.revenueTrend,
      tooltip:
        'Total value of orders completed by shoppers who interacted with ORA within 24 hours prior to checkout.',
      href: `${prefix}/orders`,
    },
    {
      id: 'orders',
      label: 'Assisted Orders',
      value: stats.orderTotal.toLocaleString(),
      icon: <ShoppingCart size={13} />,
      trend: stats.ordersTrend,
      tooltip:
        'Total orders completed after customer received product recommendations, sizing guidance, or support from ORA.',
      href: `${prefix}/orders`,
    },
    {
      id: 'conversations',
      label: 'Total Conversations',
      value: stats.conversationTotal.toLocaleString(),
      icon: <MessageSquareText size={13} />,
      trend: stats.conversationsTrend,
      tooltip:
        'All customer interactions handled by ORA across your storefront voice widget and live text chat.',
      href: `${prefix}/conversations`,
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      value: `${stats.overallConversion}%`,
      icon: <Percent size={13} />,
      tooltip:
        'Percentage of shoppers who placed an order after starting a conversation with ORA.',
      href: `${prefix}/orders`,
    },
    {
      id: 'catalog',
      label: 'Catalog Items',
      value: stats.productTotal.toLocaleString(),
      icon: <Package size={13} />,
      tooltip:
        'Active store products synced and ready for ORA to recommend to customers during live shopping.',
      href: `${prefix}/agent?role=products`,
    },
  ];

  // ── Quick action definitions for Capabilities block ────────────────────────

  const quickActions: QuickAction[] = [
    {
      id: 'qa-live',
      icon: <Radio size={16} />,
      label: 'Live Store Desk',
      description: 'Listen to active customer calls, view live cart additions, and intervene in real time.',
      href: `${prefix}/live-desk`,
    },
    {
      id: 'qa-train',
      icon: <SlidersHorizontal size={16} />,
      label: 'System Configuration & Catalog',
      description: 'Tune voice persona, store return policies, shipping rules, and sync inventory.',
      href: `${prefix}/agent`,
    },
    {
      id: 'qa-history',
      icon: <TrendingUp size={16} />,
      label: 'Conversation History',
      description: 'Search customer transcripts, review shopper buying intent, and analyze queries.',
      href: `${prefix}/conversations`,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <TopHeader
        title={`${getGreeting()}${firstName ? `, ${firstName}` : ''}`}
        badge={
          // Bound to the real state. This was hardcoded to a green dot and
          // "Storefront Active", so it contradicted the "Voice Agent Paused" label in
          // the status strip directly beneath it.
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[11px] font-medium tracking-normal bg-surface-high text-foreground border border-border/60 select-none">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isWidgetActive ? 'bg-[color:var(--status-online)]' : 'bg-muted-foreground',
              )}
            />
            {isWidgetActive ? 'Storefront Active' : 'Storefront Paused'}
          </span>
        }
        onRefresh={() => load(true)}
        isRefreshing={refreshing}
      />

      {/* Setup Guide Banner — clear actionable guidance */}
      {!isAllCompleted && !bannerDismissed && (
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 bg-surface-lowest border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-5 h-5 rounded-sm bg-surface-high flex items-center justify-center border border-border/50 text-foreground flex-shrink-0">
              <Compass size={12} className="text-foreground dark:text-primary" />
            </div>
            <span className="text-[12.5px] text-foreground font-medium truncate">
              Store setup in progress ({completedCount} of {totalSteps} steps completed) —{' '}
              {/*
                The embedded app has no /setup guide, so the outer link resolves
                to nothing there and the configuration hub is offered instead.
                In the dashboard the outer link wins and the fallback is unused.
              */}
              <AppLink
                href="/setup"
                className="font-semibold text-foreground dark:text-primary underline underline-offset-4 hover:opacity-80 inline-flex items-center gap-1"
                fallback={
                  <AppLink
                    href="/agent"
                    className="font-semibold text-foreground dark:text-primary underline underline-offset-4 hover:opacity-80 inline-flex items-center gap-1"
                  >
                    Open Configuration
                    <ArrowRight size={11} />
                  </AppLink>
                }
              >
                Complete Setup Guide
                <ArrowRight size={11} />
              </AppLink>
            </span>
          </div>
          <button
            onClick={handleDismissBanner}
            aria-label="Dismiss setup reminder"
            title="Dismiss setup reminder"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main Canvas — Minimized side margins (px-4 sm:px-6) and non-rounded flat layout */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="w-full px-4 sm:px-6 py-5 space-y-6">

          {/* Zeros must never be ambiguous: say so when the numbers below are unknown
              rather than failed-and-silent. */}
          {error && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start justify-between gap-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3"
            >
              <p className="text-[12.5px] text-foreground">
                {error} — the figures below are not current.
              </p>
              <button
                type="button"
                onClick={() => load(true)}
                disabled={refreshing}
                className="shrink-0 inline-flex items-center h-7 px-3 rounded-md border border-border/60 bg-surface-high/40 hover:bg-surface-high text-[12px] font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {refreshing ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          )}

          {loading && !error && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-md border border-border/50 px-4 py-3 text-[12.5px] text-muted-foreground"
            >
              <Loader2 size={13} className="animate-spin" />
              <span>Loading your store performance…</span>
            </div>
          )}

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
