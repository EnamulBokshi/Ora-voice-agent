'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CreditCard,
  Layers,
  Tag,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/admin-header';
import { PlatformStatCard } from '@/components/admin/platform-stat-card';
import { SubscriptionsTab } from './subscriptions-tab';
import { PlansTab } from './plans-tab';
import { CouponsTab } from './coupons-tab';
import { SubscriptionDrawer } from './subscription-drawer';

import {
  fetchAdminBillingStats,
  fetchAdminPlans,
  fetchAdminSubscriptions,
  fetchAdminCoupons,
} from '@/services/admin-billing-service';

import {
  AdminBillingStatsResponse,
  AdminPlanItem,
  AdminSubscriptionItem,
  AdminCouponItem,
} from '@/types/admin-billing';
import { cn } from '@/lib/utils';

type ActiveTab = 'subscriptions' | 'plans' | 'coupons';

export function AdminBillingView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state synced to URL query parameter
  const tabParam = searchParams.get('tab') as ActiveTab | null;
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    tabParam && ['subscriptions', 'plans', 'coupons'].includes(tabParam)
      ? tabParam
      : 'subscriptions',
  );

  // Sync state if URL searchParams change
  useEffect(() => {
    if (tabParam && ['subscriptions', 'plans', 'coupons'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/admin/billing?${params.toString()}`, { scroll: false });
  };

  // Toast / Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Global Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats / Telemetry
  const [stats, setStats] = useState<AdminBillingStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Plans State
  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Subscriptions Tab State
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [subsPagination, setSubsPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [subsSearch, setSubsSearch] = useState('');
  const [subsStatusFilter, setSubsStatusFilter] = useState('all');
  const [subsProviderFilter, setSubsProviderFilter] = useState('all');
  const [subsPlanFilter, setSubsPlanFilter] = useState('all');

  // Selected Subscription for Drawer Inspection
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);

  // Coupons Tab State
  const [coupons, setCoupons] = useState<AdminCouponItem[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsPagination, setCouponsPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [couponsSearch, setCouponsSearch] = useState('');
  const [couponsStatusFilter, setCouponsStatusFilter] = useState('all');
  const [couponsTypeFilter, setCouponsTypeFilter] = useState('all');

  // 1. Fetch Stats & Telemetry
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchAdminBillingStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load billing stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 2. Fetch Plans
  const loadPlans = useCallback(async () => {
    try {
      const data = await fetchAdminPlans(true);
      setPlans(data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // 3. Fetch Subscriptions
  const loadSubscriptions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res = await fetchAdminSubscriptions({
        page: subsPagination.page,
        limit: subsPagination.limit,
        search: subsSearch || undefined,
        status: subsStatusFilter,
        billingProvider: subsProviderFilter,
        planId: subsPlanFilter,
      });
      setSubscriptions(res.items || []);
      setSubsPagination((prev) => ({
        ...prev,
        total: res.pagination?.total || 0,
        totalPages: res.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setSubsLoading(false);
    }
  }, [
    subsPagination.page,
    subsPagination.limit,
    subsSearch,
    subsStatusFilter,
    subsProviderFilter,
    subsPlanFilter,
  ]);

  // 4. Fetch Coupons
  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const res = await fetchAdminCoupons({
        page: couponsPagination.page,
        limit: couponsPagination.limit,
        search: couponsSearch || undefined,
        status: couponsStatusFilter,
        discountType: couponsTypeFilter,
      });
      setCoupons(res.items || []);
      setCouponsPagination((prev) => ({
        ...prev,
        total: res.pagination?.total || 0,
        totalPages: res.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setCouponsLoading(false);
    }
  }, [
    couponsPagination.page,
    couponsPagination.limit,
    couponsSearch,
    couponsStatusFilter,
    couponsTypeFilter,
  ]);

  // Initial Load
  useEffect(() => {
    loadStats();
    loadPlans();
  }, [loadStats, loadPlans]);

  // Load active tab data
  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptions();
    } else if (activeTab === 'coupons') {
      loadCoupons();
    }
  }, [activeTab, loadSubscriptions, loadCoupons]);

  // Master Refresh
  const handleMasterRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadStats(),
        loadPlans(),
        activeTab === 'subscriptions'
          ? loadSubscriptions()
          : activeTab === 'coupons'
            ? loadCoupons()
            : Promise.resolve(),
      ]);
      showNotification('success', 'Billing telemetry and records refreshed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format currency helpers
  const mrrFormatted = stats?.overview?.mrrUsd
    ? `$${(stats.overview.mrrUsd / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '$0';

  const arrFormatted = stats?.overview?.arrUsd
    ? `$${(stats.overview.arrUsd / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '$0';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* ── SuperAdmin Header ── */}
      <AdminHeader
        title="Billing & Subscriptions"
        description="Manage subscription tiers, store billing lifecycles, and promotional discounts."
        onRefresh={handleMasterRefresh}
        isRefreshing={isRefreshing}
      />

      {/* ── Toast Feedback Notification ── */}
      {feedback && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-medium backdrop-blur-md',
              feedback.type === 'success'
                ? 'border-primary/40 bg-surface-container text-foreground'
                : 'border-destructive/40 bg-surface-container text-destructive',
            )}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-primary shrink-0" />
            ) : (
              <XCircle size={16} className="text-destructive shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* ── 4-KPI Telemetry Ribbon ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlatformStatCard
            title="MRR"
            prefix="$"
            value={
              stats?.overview?.mrrUsd
                ? (stats.overview.mrrUsd / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                : '0'
            }
            subtitle={`ARR: ${arrFormatted}`}
            icon={<DollarSign size={18} />}
            highlight={true}
            valueColor="text-foreground"
          />

          <PlatformStatCard
            title="Subscriptions"
            value={(stats?.overview?.activeSubscriptions ?? 0).toLocaleString()}
            subtitle={`${stats?.overview?.trialingSubscriptions ?? 0} trialing · ${stats?.overview?.totalTrackedSubscriptions ?? 0} total`}
            icon={<CreditCard size={18} />}
            highlight={false}
          />

          <PlatformStatCard
            title="Past Due"
            value={(stats?.overview?.pastDueSubscriptions ?? 0).toLocaleString()}
            subtitle={`${stats?.overview?.suspendedSubscriptions ?? 0} suspended · ${stats?.overview?.renewalsDue7Days ?? 0} due in 7d`}
            icon={<AlertTriangle size={18} />}
            highlight={stats?.overview?.pastDueSubscriptions ? true : false}
            valueColor={
              stats?.overview?.pastDueSubscriptions
                ? 'text-destructive font-bold'
                : 'text-foreground'
            }
          />

          <PlatformStatCard
            title="Coupons"
            value={(stats?.couponTelemetry?.totalRedemptions ?? 0).toLocaleString()}
            subtitle={`${stats?.couponTelemetry?.activeCoupons ?? 0} active · $${(((stats?.couponTelemetry?.totalDiscountVolumeUsd ?? 0) / 100)).toFixed(0)} saved`}
            icon={<Tag size={18} />}
            highlight={false}
          />
        </div>

        {/* ── Segmented Tab Switcher (Stripe / Linear style) ── */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container border border-border rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => handleTabChange('subscriptions')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all',
              activeTab === 'subscriptions'
                ? 'bg-surface-high text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CreditCard size={14} className={activeTab === 'subscriptions' ? 'text-primary' : ''} />
            <span>Subscriptions</span>
            {subsPagination.total > 0 && (
              <span className="tabular-nums font-semibold text-[10px] px-1.5 py-0.5 rounded-full bg-surface-lowest text-muted-foreground border border-border">
                {subsPagination.total}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('plans')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all',
              activeTab === 'plans'
                ? 'bg-surface-high text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Layers size={14} className={activeTab === 'plans' ? 'text-primary' : ''} />
            <span>Plans</span>
            <span className="tabular-nums font-semibold text-[10px] px-1.5 py-0.5 rounded-full bg-surface-lowest text-muted-foreground border border-border">
              {plans.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('coupons')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all',
              activeTab === 'coupons'
                ? 'bg-surface-high text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Tag size={14} className={activeTab === 'coupons' ? 'text-primary' : ''} />
            <span>Coupons</span>
            {couponsPagination.total > 0 && (
              <span className="tabular-nums font-semibold text-[10px] px-1.5 py-0.5 rounded-full bg-surface-lowest text-muted-foreground border border-border">
                {couponsPagination.total}
              </span>
            )}
          </button>
        </div>

        {/* ── Tab Content Views ── */}
        <div>
          {activeTab === 'subscriptions' && (
            <SubscriptionsTab
              subscriptions={subscriptions}
              pagination={subsPagination}
              searchQuery={subsSearch}
              onSearchChange={(q) => {
                setSubsSearch(q);
                setSubsPagination((p) => ({ ...p, page: 1 }));
              }}
              statusFilter={subsStatusFilter}
              onStatusFilterChange={(s) => {
                setSubsStatusFilter(s);
                setSubsPagination((p) => ({ ...p, page: 1 }));
              }}
              providerFilter={subsProviderFilter}
              onProviderFilterChange={(pr) => {
                setSubsProviderFilter(pr);
                setSubsPagination((p) => ({ ...p, page: 1 }));
              }}
              planFilter={subsPlanFilter}
              onPlanFilterChange={(pl) => {
                setSubsPlanFilter(pl);
                setSubsPagination((p) => ({ ...p, page: 1 }));
              }}
              onPageChange={(page) => setSubsPagination((p) => ({ ...p, page }))}
              onInspect={(id) => setSelectedSubscriptionId(id)}
              availablePlans={plans}
              loading={subsLoading}
            />
          )}

          {activeTab === 'plans' && (
            <PlansTab
              plans={plans}
              loading={plansLoading}
              onRefresh={() => {
                loadPlans();
                loadStats();
              }}
              onNotification={showNotification}
            />
          )}

          {activeTab === 'coupons' && (
            <CouponsTab
              coupons={coupons}
              pagination={couponsPagination}
              searchQuery={couponsSearch}
              onSearchChange={(q) => {
                setCouponsSearch(q);
                setCouponsPagination((p) => ({ ...p, page: 1 }));
              }}
              statusFilter={couponsStatusFilter}
              onStatusFilterChange={(s) => {
                setCouponsStatusFilter(s);
                setCouponsPagination((p) => ({ ...p, page: 1 }));
              }}
              typeFilter={couponsTypeFilter}
              onTypeFilterChange={(t) => {
                setCouponsTypeFilter(t);
                setCouponsPagination((p) => ({ ...p, page: 1 }));
              }}
              onPageChange={(page) => setCouponsPagination((p) => ({ ...p, page }))}
              availablePlans={plans}
              loading={couponsLoading}
              onRefresh={() => {
                loadCoupons();
                loadStats();
              }}
              onNotification={showNotification}
            />
          )}
        </div>
      </main>

      {/* ── Slide-over Subscription Drawer ── */}
      <SubscriptionDrawer
        open={Boolean(selectedSubscriptionId)}
        subscriptionId={selectedSubscriptionId}
        onClose={() => setSelectedSubscriptionId(null)}
        onUpdated={() => {
          showNotification('success', 'Subscription updated.');
          loadSubscriptions();
          loadStats();
        }}
        availablePlans={plans}
      />
    </div>
  );
}
