'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Store,
  Mic,
  MessageSquare,
  Activity,
  Server,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Clock,
  Users,
  Package,
  TrendingUp,
  Radio,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Shield,
  Volume2,
  Coins,
} from 'lucide-react';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import { MetricDisplay } from '@/components/ui/metric-display';
import { fetchPlatformStats, fetchVoiceSessions } from '@/services/admin-service';
import { PlatformStatsData, VoiceSessionItem } from '@/types/admin';
import { cn } from '@/lib/utils';

export function AdminOverviewView() {
  const [data, setData] = useState<PlatformStatsData | null>(null);
  const [voiceSessions, setVoiceSessions] = useState<VoiceSessionItem[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d'>('30d');
  const [activeMetric, setActiveMetric] = useState<'voiceMinutes' | 'conversations' | 'newStores' | 'gmv'>('voiceMinutes');
  const [activeTab, setActiveTab] = useState<'merchants' | 'voice'>('merchants');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isManualRefresh = false, selectedPeriod = period) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [stats, voiceRes] = await Promise.all([
        fetchPlatformStats(selectedPeriod),
        fetchVoiceSessions(8).catch(() => ({ sessions: [] })),
      ]);
      setData(stats);
      setVoiceSessions(voiceRes.sessions || []);
    } catch (err) {
      setError('Failed to load platform statistics. Verify backend server connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadData(false, period);
  }, [loadData, period]);

  const handlePeriodChange = (newPeriod: '7d' | '30d') => {
    setPeriod(newPeriod);
    loadData(true, newPeriod);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const overview = data?.overview;
  const system = data?.system;
  const recentSignups = data?.recentSignups || [];
  const timeline = data?.activityTimeline || [];

  // Chart calculations
  const maxMetricValue = Math.max(
    ...timeline.map((t) => t[activeMetric] || 0),
    1
  );

  const totalGrowthMRR = overview?.platformMRR || 0;
  const totalARR = overview?.platformARR || totalGrowthMRR * 12;
  const planDist = overview?.planDistribution || { free: 0, growth: 0, scale: 0 };
  const totalSubscribers = (planDist.free + planDist.growth + planDist.scale) || 1;

  const freePct = Math.round((planDist.free / totalSubscribers) * 100);
  const growthPct = Math.round((planDist.growth / totalSubscribers) * 100);
  const scalePct = Math.round((planDist.scale / totalSubscribers) * 100);

  const voiceTotal = overview?.voiceConversationsCount || 0;
  const textTotal = overview?.textConversationsCount || 0;
  const allConvs = voiceTotal + textTotal || 1;
  const voicePct = Math.round((voiceTotal / allConvs) * 100);
  const textPct = 100 - voicePct;

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Platform Command Overview"
        description="Platform telemetry, merchants, revenue, and live AI streams."
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Command Top Bar: Period Controls & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-surface-container p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/20">
              <Activity size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">ORA Platform Pulse</h2>
              <p className="text-[11px] text-muted-foreground">
                Aggregating live data across {overview?.totalBusinesses || 0} stores and {overview?.totalUsers || 0} admin users.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/token-usage"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-bright text-xs font-semibold text-foreground border border-border transition-colors shadow-sm"
            >
              <Coins size={14} className="text-primary" />
              <span>Token & OpEx Analytics</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Timeframe:</span>
              <div className="flex items-center rounded-lg border border-border bg-surface-high p-0.5">
                <button
                  onClick={() => handlePeriodChange('7d')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                    period === '7d'
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  7 Days
                </button>
                <button
                  onClick={() => handlePeriodChange('30d')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                    period === '30d'
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  30 Days
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Core KPI Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlatformStatCard
            title="Platform MRR"
            value={loading ? '...' : `$${totalGrowthMRR.toLocaleString()}`}
            subtitle={`ARR: $${totalARR.toLocaleString()} / year`}
            icon={<DollarSign size={18} />}
            trend={overview?.growth?.mrrTrend || '+18.4%'}
            trendUp={true}
            highlight={true}
          />

          <PlatformStatCard
            title="Total AI Sales & GMV"
            value={loading ? '...' : `$${(overview?.totalGmv || 0).toLocaleString()}`}
            subtitle={`ORA Agent: $${(overview?.oraAgentGmv || 0).toLocaleString()} (${overview?.oraAgentOrders || 0} orders)`}
            icon={<TrendingUp size={18} />}
            trend="Live Agent GMV"
            trendUp={true}
          />

          <PlatformStatCard
            title="Active Stores"
            value={loading ? '...' : `${overview?.activeBusinesses || 0}`}
            subtitle={`${overview?.totalBusinesses || 0} total (${overview?.suspendedBusinesses || 0} suspended)`}
            icon={<Store size={18} />}
            trend={overview?.growth?.storeTrend || '+12.5%'}
            trendUp={!overview?.suspendedBusinesses}
          />

          <PlatformStatCard
            title="AI Voice Minutes"
            value={loading ? '...' : `${(overview?.totalVoiceMinutes || 0).toLocaleString()} m`}
            subtitle={`${overview?.voiceConversationsCount || 0} voice sessions (${textTotal} chats)`}
            icon={<Mic size={18} />}
            trend={overview?.growth?.voiceTrend || '+31.2%'}
            trendUp={true}
          />
        </div>

        {/* Visual Analytics & Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activity Timeline Chart (2 Cols) */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-surface-container p-5 flex flex-col justify-between space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Activity size={15} className="text-primary" />
                  <span>Platform Activity Trajectory</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Daily performance telemetry across all merchant stores
                </p>
              </div>

              {/* Metric Selector Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={activeMetric}
                  onChange={(e) =>
                    setActiveMetric(
                      e.target.value as
                        | 'voiceMinutes'
                        | 'conversations'
                        | 'newStores'
                        | 'gmv',
                    )
                  }
                  className="rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30 cursor-pointer shadow-xs"
                >
                  <option value="voiceMinutes">Voice Mins</option>
                  <option value="conversations">Conversations</option>
                  <option value="newStores">New Stores</option>
                  <option value="gmv">GMV ($)</option>
                </select>
              </div>
            </div>

            {/* SVG Interactive Area / Bar Chart */}
            <div className="h-48 w-full pt-4 flex items-end gap-1 sm:gap-2">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                  Generating timeline visualization...
                </div>
              ) : timeline.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  No activity points recorded for this timeframe.
                </div>
              ) : (
                timeline.map((point, index) => {
                  const val = point[activeMetric] || 0;
                  const heightPct = Math.max(8, Math.min(100, Math.round((val / maxMetricValue) * 100)));
                  const isHovered = hoveredIndex === index;

                  return (
                    <div
                      key={point.date}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-10 z-20 whitespace-nowrap rounded-lg bg-surface-high border border-border px-2.5 py-1 text-xs shadow-xl text-foreground">
                          <span className="font-serif font-bold text-primary tabular-nums">
                            {activeMetric === 'gmv' ? `$${val.toLocaleString()}` : val.toLocaleString()}
                          </span>{' '}
                          <span className="text-muted-foreground text-[10px]">({point.date})</span>
                        </div>
                      )}

                      <div
                        className={cn(
                          'w-full rounded-t-md transition-all duration-300',
                          isHovered
                            ? 'bg-primary shadow-lg shadow-primary/30'
                            : 'bg-primary/40 hover:bg-primary/70'
                        )}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Timeline X-Axis Labels */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
              <span className="tabular-nums">{timeline[0]?.date || 'Start Date'}</span>
              <span className="text-foreground font-semibold">
                Metric: {activeMetric.toUpperCase()} ({period.toUpperCase()})
              </span>
              <span className="tabular-nums">{timeline[timeline.length - 1]?.date || 'Today'}</span>
            </div>
          </div>

          {/* Plan Distribution & Channel Split (1 Col) */}
          <div className="space-y-4">
            {/* Subscription Tier Distribution Card */}
            <div className="rounded-xl border border-border bg-surface-container p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground font-heading">Subscription Tiers</h3>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif font-semibold text-primary text-base tabular-nums">
                    ${totalGrowthMRR.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">/mo MRR</span>
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-3 w-full rounded-full bg-surface-high flex overflow-hidden">
                <div
                  style={{ width: `${scalePct}%` }}
                  className="bg-primary transition-all duration-500"
                  title={`Scale: ${planDist.scale} stores (${scalePct}%)`}
                />
                <div
                  style={{ width: `${growthPct}%` }}
                  className="bg-primary/60 transition-all duration-500"
                  title={`Growth: ${planDist.growth} stores (${growthPct}%)`}
                />
                <div
                  style={{ width: `${freePct}%` }}
                  className="bg-surface-bright transition-all duration-500"
                  title={`Free: ${planDist.free} stores (${freePct}%)`}
                />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-foreground font-medium">Scale ($199/mo)</span>
                  </div>
                  <span className="font-serif font-semibold text-foreground tabular-nums text-sm">
                    {planDist.scale} <span className="text-[11px] font-sans font-normal text-muted-foreground">stores</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                    <span className="text-foreground font-medium">Growth ($49/mo)</span>
                  </div>
                  <span className="font-serif font-semibold text-foreground tabular-nums text-sm">
                    {planDist.growth} <span className="text-[11px] font-sans font-normal text-muted-foreground">stores</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-surface-bright" />
                    <span className="text-muted-foreground font-medium">Free Tier ($0/mo)</span>
                  </div>
                  <span className="font-serif font-semibold text-muted-foreground tabular-nums text-sm">
                    {planDist.free} <span className="text-[11px] font-sans font-normal text-muted-foreground">stores</span>
                  </span>
                </div>
              </div>
            </div>

            {/* AI Voice vs Chat Split Card */}
            <div className="rounded-xl border border-border bg-surface-container p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground font-heading">Traffic Channels</h3>
                <span className="text-[11px] text-muted-foreground font-medium">Channel Ratio</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-surface-high border border-border/60 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Mic size={14} />
                    <span className="font-bold text-xs">AI Voice</span>
                  </div>
                  <div className="pt-0.5">
                    <MetricDisplay value={`${voicePct}%`} size="md" className="text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">{voiceTotal.toLocaleString()} voice sessions</p>
                </div>

                <div className="rounded-xl bg-surface-high border border-border/60 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare size={14} />
                    <span className="font-bold text-xs">Text Chat</span>
                  </div>
                  <div className="pt-0.5">
                    <MetricDisplay value={`${textPct}%`} size="md" className="text-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">{textTotal.toLocaleString()} chats</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Infrastructure Pulse Strip */}
        <div className="rounded-xl border border-border bg-surface-container p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Global Infrastructure & Runtime Pulse</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                Node {system?.nodeVersion || 'v20+'} | Env: {system?.environment || 'dev'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="flex flex-col gap-1 rounded-lg bg-surface-high p-3">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold">MongoDB Cluster</span>
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <CheckCircle2 size={14} />
                <span>{system?.mongoStatus || 'Connected'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-lg bg-surface-high p-3">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold">Redis Session Cache</span>
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Activity size={14} className="text-primary" />
                <span>
                  {system?.redisStatus === 'healthy' ? `Healthy (${system.redisLatencyMs}ms)` : 'Degraded'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-lg bg-surface-high p-3">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold">Heap / Total Memory</span>
              <div className="font-mono font-semibold text-foreground">
                {system ? `${system.nodeMemoryUsageMB} MB / ${system.nodeMemoryTotalMB || 256} MB` : 'Analyzing...'}
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-lg bg-surface-high p-3">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold">Process Uptime</span>
              <div className="font-mono font-semibold text-foreground">
                {system ? `${Math.floor(system.serverUptimeSeconds / 3600)}h ${Math.floor((system.serverUptimeSeconds % 3600) / 60)}m` : 'Active'}
              </div>
            </div>
          </div>
        </div>

        {/* Dual Tab Activity Section: Recent Stores vs Live Voice Feed */}
        <div className="rounded-xl border border-border bg-surface-container p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('merchants')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  activeTab === 'merchants'
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:bg-surface-high hover:text-foreground'
                )}
              >
                <Store size={14} />
                <span>Recent Merchant Onboardings</span>
                <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                  {recentSignups.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('voice')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  activeTab === 'voice'
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:bg-surface-high hover:text-foreground'
                )}
              >
                <Radio size={14} className="animate-pulse" />
                <span>Live AI Voice Sessions</span>
                <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                  {voiceSessions.length}
                </span>
              </button>
            </div>

            <Link
              href={activeTab === 'merchants' ? '/admin/merchants' : '/admin/voice-monitor'}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline self-end sm:self-auto"
            >
              <span>{activeTab === 'merchants' ? 'View Full Directory' : 'Open Voice Monitor'}</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Tab 1: Recent Merchants Table */}
          {activeTab === 'merchants' && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Store Name</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Publishable Key</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Onboarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                        Loading recent stores...
                      </td>
                    </tr>
                  ) : recentSignups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No merchant records found.
                      </td>
                    </tr>
                  ) : (
                    recentSignups.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-high/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{s.domain || 'N/A'}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[140px]">{s.publishableKey}</span>
                            <button
                              onClick={() => copyToClipboard(s.publishableKey)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Copy publishable key"
                            >
                              {copiedKey === s.publishableKey ? (
                                <Check size={12} className="text-primary" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] capitalize text-foreground">
                          {s.connectedPlatform}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              s.status === 'active'
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : 'bg-destructive/15 text-destructive border border-destructive/30'
                            )}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'Recent'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Live AI Voice Sessions Feed */}
          {activeTab === 'voice' && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Session ID</th>
                    <th className="px-4 py-3">Store Tenant</th>
                    <th className="px-4 py-3">Shopper / Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Voice Turns</th>
                    <th className="px-4 py-3 text-right">Last Interaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {voiceSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No active or recorded voice sessions yet.
                      </td>
                    </tr>
                  ) : (
                    voiceSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-surface-high/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Volume2 size={13} className="text-primary" />
                            <span>{session.sessionId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{session.businessName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{session.customerIdentifier}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              session.status === 'active'
                                ? 'bg-primary/20 text-primary border border-primary/40 animate-pulse'
                                : 'bg-surface-high text-muted-foreground border border-border'
                            )}
                          >
                            {session.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                          {session.turnCount}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums text-[11px]">
                          {session.updatedAt ? new Date(session.updatedAt).toLocaleTimeString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Administrative Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/merchants"
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-container hover:bg-surface-high hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-high text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Store size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Store Directory</h4>
                <p className="text-[10px] text-muted-foreground">Manage merchant accounts</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/admin/users"
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-container hover:bg-surface-high hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-high text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Users size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">User & RBAC Registry</h4>
                <p className="text-[10px] text-muted-foreground">Audit cross-tenant roles</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/admin/voice-monitor"
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-container hover:bg-surface-high hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-high text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Radio size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">AI Voice Telemetry</h4>
                <p className="text-[10px] text-muted-foreground">Inspect active audio streams</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/admin/system"
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-container hover:bg-surface-high hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-high text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Server size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">System Diagnostics</h4>
                <p className="text-[10px] text-muted-foreground">Memory, Redis & DB health</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
