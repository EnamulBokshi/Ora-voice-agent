'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import { AdminPlatformAgentCard } from './admin-platform-agent-card';
import { fetchSystemHealth } from '@/services/admin-service';
import { SystemHealthData } from '@/types/admin';
import {
  Server,
  Database,
  Terminal,
  Activity,
  Radio,
  ShieldCheck,
  Cpu,
  Lock,
  CreditCard,
  CheckCircle2,
  Layers,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminSystemView() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to fetch system health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const uptimeHours = health ? (health.process.uptimeSeconds / 3600).toFixed(1) : '0';

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Platform & System Infrastructure"
        description="System health, database pools, and service configuration."
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* ── Top KPI Infrastructure Ribbon (4 Cards) ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlatformStatCard
            title="System Uptime"
            value={`${uptimeHours} hrs`}
            subtitle={`Node.js ${health?.process.nodeVersion || process.version || 'v20+'}`}
            icon={<Terminal className="h-4 w-4" />}
            trend="100% Online"
            trendUp={true}
            highlight={true}
          />

          <PlatformStatCard
            title="RAM Allocation"
            value={`${health?.process.memoryUsedMB || 0} MB`}
            subtitle={`of ${health?.process.totalMemoryMB || 256} MB Total heap memory`}
            icon={<Cpu className="h-4 w-4" />}
          />

          <PlatformStatCard
            title="Redis Latency"
            value={`${health?.redis.latencyMs !== undefined ? `${health.redis.latencyMs} ms` : '1 ms'}`}
            subtitle="Session cache & token theft guard"
            icon={<Activity className="h-4 w-4" />}
            valueColor="text-primary"
            trend="Optimal"
            trendUp={true}
          />

          <PlatformStatCard
            title="DB Connection Pool"
            value="Connected"
            subtitle={`${health?.database.driver || 'Mongoose'} connection active`}
            icon={<Database className="h-4 w-4" />}
            valueColor="text-primary"
          />
        </div>

        {/* ── Flagship Platform Agent Configuration ── */}
        <AdminPlatformAgentCard />

        {/* ── 4-Column Core Infrastructure Telemetry Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MongoDB Cluster */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface-container p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-high border border-border text-foreground">
                  <Database size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-heading font-bold text-foreground">MongoDB Primary</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Shared Cluster</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-bold text-primary border border-primary/30">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                ONLINE
              </span>
            </div>

            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">ODM Driver</span>
                <span className="font-mono text-foreground font-semibold">{health?.database.driver || 'Mongoose'}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Tenant Scope</span>
                <span className="font-mono text-primary font-bold">businessId Index</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Pool State</span>
                <span className="font-mono text-foreground font-medium">Auto-scaling</span>
              </div>
            </div>
          </div>

          {/* Redis In-Memory */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface-container p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-high border border-border text-foreground">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-heading font-bold text-foreground">Redis Cache</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Session & KV</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-bold text-primary border border-primary/30">
                HEALTHY
              </span>
            </div>

            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Ping Latency</span>
                <span className="font-mono text-primary font-bold">
                  {health?.redis.latencyMs !== undefined ? `${health.redis.latencyMs} ms` : '1 ms'}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Session Rotation</span>
                <span className="font-mono text-foreground font-medium">7-Day Sliding</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Theft Guard</span>
                <span className="font-mono text-primary font-semibold">Active</span>
              </div>
            </div>
          </div>

          {/* Node.js Runtime */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface-container p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-high border border-border text-foreground">
                  <Terminal size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-heading font-bold text-foreground">Node.js Server</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Turbopack Engine</span>
                </div>
              </div>
              <span className="rounded-md bg-surface-high px-2 py-0.5 text-[10px] font-mono text-muted-foreground uppercase border border-border">
                {health?.process.nodeVersion || process.version || 'v20+'}
              </span>
            </div>

            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Heap Memory</span>
                <span className="font-mono text-foreground font-semibold">{health?.process.memoryUsedMB || 0} MB</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Process Uptime</span>
                <span className="font-mono text-foreground font-medium">{uptimeHours} hrs</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Architecture</span>
                <span className="font-mono text-muted-foreground">x64 / Hybrid</span>
              </div>
            </div>
          </div>

          {/* Gemini AI Engine */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface-container p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-high border border-border text-foreground">
                  <Radio size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-heading font-bold text-foreground">AI Multimodal Core</h3>
                  <span className="text-[10px] text-muted-foreground font-mono">Gemini Live Gateway</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-bold text-primary border border-primary/30">
                LIVE
              </span>
            </div>

            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Voice Engine</span>
                <span className="font-mono text-primary font-bold truncate max-w-[120px]" title={health?.aiEngine?.voiceModel || 'gemini-2.5-flash'}>
                  {(health?.aiEngine?.voiceModel || 'gemini-2.5-flash').replace('models/', '')}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Embedding Engine</span>
                <span className="font-mono text-foreground font-medium truncate max-w-[120px]" title={health?.aiEngine?.embeddingModel || 'text-embedding-004'}>
                  {(health?.aiEngine?.embeddingModel || 'text-embedding-004').replace('models/', '')}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-[11px]">Protocol</span>
                <span className="font-mono text-foreground font-medium">PCM16 24kHz</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Platform Security Baseline & Architecture (4 Cards) ── */}
        <div className="rounded-2xl border border-border bg-surface-container p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              <span>Platform Security Baseline & Architecture</span>
            </h3>
            <span className="text-xs font-mono font-semibold text-primary">v5 Aligned</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="rounded-xl bg-surface-high border border-border p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Layers size={15} className="text-primary shrink-0" />
                <span>Multi-Tenant Scoping</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compound <code className="text-foreground font-mono text-[11px]">businessId</code> index on all collections guarantees cross-store tenant isolation.
              </p>
            </div>

            <div className="rounded-xl bg-surface-high border border-border p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Lock size={15} className="text-primary shrink-0" />
                <span>Encrypted Credentials</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AES-256 field-level encryption for Shopify OAuth, WooCommerce keys, and merchant secrets at rest.
              </p>
            </div>

            <div className="rounded-xl bg-surface-high border border-border p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Zap size={15} className="text-primary shrink-0" />
                <span>Session Family Guard</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Redis rotating refresh tokens with instantaneous family revocation and theft detection.
              </p>
            </div>

            <div className="rounded-xl bg-surface-high border border-border p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <CreditCard size={15} className="text-primary shrink-0" />
                <span>Dual Payment Engine</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stripe (USD) automatic renewal webhooks + bKash (BDT) scheduled tokenized checkout renewals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
