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
} from 'lucide-react';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import { fetchPlatformStats } from '@/services/admin-service';
import { PlatformStatsData } from '@/types/admin';

export function AdminOverviewView() {
  const [data, setData] = useState<PlatformStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const stats = await fetchPlatformStats();
      setData(stats);
    } catch (err) {
      setError('Failed to load platform statistics. Verify backend connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const overview = data?.overview;
  const system = data?.system;
  const recentSignups = data?.recentSignups || [];

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Platform Command Overview"
        description="Global system telemetry, merchant activity, and AI voice metrics across all active stores."
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlatformStatCard
            title="Estimated MRR"
            value={loading ? '...' : `$${(overview?.platformMRR || 0).toLocaleString()}`}
            subtitle="Platform subscription revenue"
            icon={<DollarSign size={18} />}
            trend="+18.4%"
            trendUp={true}
            highlight={true}
          />

          <PlatformStatCard
            title="Active Stores"
            value={loading ? '...' : `${overview?.activeBusinesses || 0}`}
            subtitle={`${overview?.totalBusinesses || 0} total registered stores`}
            icon={<Store size={18} />}
            trend={overview?.suspendedBusinesses ? `${overview.suspendedBusinesses} suspended` : '100% active'}
            trendUp={!overview?.suspendedBusinesses}
          />

          <PlatformStatCard
            title="AI Voice Minutes"
            value={loading ? '...' : `${(overview?.totalVoiceMinutes || 0).toLocaleString()} m`}
            subtitle={`${overview?.voiceConversationsCount || 0} voice sessions`}
            icon={<Mic size={18} />}
            trend="Live"
            trendUp={true}
          />

          <PlatformStatCard
            title="Total Conversations"
            value={loading ? '...' : `${(overview?.totalConversations || 0).toLocaleString()}`}
            subtitle={`${overview?.totalCustomers || 0} unique shoppers`}
            icon={<MessageSquare size={18} />}
          />
        </div>

        {/* System Diagnostics Strip */}
        <div className="rounded-xl border border-border bg-surface-container p-5">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Infrastructure Pulse</h2>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              Node Process: {system ? `${system.serverUptimeSeconds}s uptime` : 'Active'}
            </span>
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
              <span className="text-muted-foreground text-[10px] uppercase font-semibold">Redis Session Store</span>
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Activity size={14} className="text-primary" />
                <span>
                  {system?.redisStatus === 'healthy' ? `Healthy (${system.redisLatencyMs}ms)` : 'Degraded'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-lg bg-surface-high p-3">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold">Process Memory</span>
              <div className="font-mono font-semibold text-foreground">
                {system ? `${system.nodeMemoryUsageMB} MB heap` : 'Analyzing...'}
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-lg bg-surface-high p-3">
              <span className="text-muted-foreground text-[10px] uppercase font-semibold">Global Users</span>
              <div className="font-mono font-semibold text-foreground">
                {overview ? `${overview.totalUsers} registered` : 'Loading...'}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Merchants Snapshot */}
        <div className="rounded-xl border border-border bg-surface-container p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent Merchant Onboardings</h2>
              <p className="text-xs text-muted-foreground">Latest stores registered on the ORA platform</p>
            </div>
            <Link
              href="/admin/merchants"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>View All Merchants</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-lowest text-muted-foreground font-semibold uppercase tracking-wider text-[10px] border-b border-border">
                <tr>
                  <th className="px-4 py-3">Store Name</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Publishable Key</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Onboarded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                      Loading recent stores...
                    </td>
                  </tr>
                ) : recentSignups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No merchant records found.
                    </td>
                  </tr>
                ) : (
                  recentSignups.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-high/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{s.domain || 'N/A'}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {s.publishableKey}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30">
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
        </div>
      </div>
    </div>
  );
}
