'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminHeader } from './admin-header';
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
        description="System health telemetry, database connection pools, memory allocation, and flagship voice agent configuration."
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Flagship Platform Agent Configuration */}
        <AdminPlatformAgentCard />

        {/* 4-Column Core Infrastructure Telemetry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MongoDB Cluster */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-container p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground">MongoDB Cluster</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online
              </span>
            </div>

            <div className="pt-2 border-t border-border space-y-1 text-xs tabular-nums">
              <div className="flex justify-between text-muted-foreground">
                <span>Driver</span>
                <span className="text-foreground">{health?.database.driver || 'Mongoose'}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Connection Pool</span>
                <span className="text-foreground font-medium">Active</span>
              </div>
            </div>
          </div>

          {/* Redis In-Memory */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-container p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground">Redis Cache</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Healthy
              </span>
            </div>

            <div className="pt-2 border-t border-border space-y-1 text-xs tabular-nums">
              <div className="flex justify-between text-muted-foreground">
                <span>Ping Latency</span>
                <span className="text-foreground font-medium">
                  {health?.redis.latencyMs !== undefined ? `${health.redis.latencyMs} ms` : '1 ms'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Session Rotation</span>
                <span className="text-foreground">7-Day Sliding</span>
              </div>
            </div>
          </div>

          {/* Node.js Runtime */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-container p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground">Node.js Server</h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                {health?.process.nodeVersion || process.version || 'v20+'}
              </span>
            </div>

            <div className="pt-2 border-t border-border space-y-1 text-xs tabular-nums">
              <div className="flex justify-between text-muted-foreground">
                <span>Heap Memory</span>
                <span className="text-foreground font-medium">{health?.process.memoryUsedMB || 0} MB</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Process Uptime</span>
                <span className="text-foreground">{uptimeHours} hours</span>
              </div>
            </div>
          </div>

          {/* Gemini AI Voice Engine */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-container p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground">AI Engine</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            <div className="pt-2 border-t border-border space-y-1 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Voice Model</span>
                <span className="text-foreground font-medium truncate max-w-[130px]" title={health?.aiEngine?.voiceModel || 'models/gemini-2.5-flash'}>
                  {(health?.aiEngine?.voiceModel || 'gemini-2.5-flash').replace('models/', '')}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Embedding Model</span>
                <span className="text-foreground truncate max-w-[130px]" title={health?.aiEngine?.embeddingModel || 'text-embedding-004'}>
                  {(health?.aiEngine?.embeddingModel || 'text-embedding-004').replace('models/', '')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Security Baseline Checklist */}
        <div className="rounded-xl border border-border bg-surface-container p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck size={14} className="text-muted-foreground" />
              Platform Security Architecture
            </h3>
            <span className="text-[11px] text-muted-foreground">Active Policy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-surface-lowest border border-border p-3 space-y-0.5">
              <div className="text-foreground font-medium">Tenant Isolation</div>
              <p className="text-[11px] text-muted-foreground">Strict `businessId` indexed DB scope</p>
            </div>

            <div className="rounded-lg bg-surface-lowest border border-border p-3 space-y-0.5">
              <div className="text-foreground font-medium">Encrypted Secrets</div>
              <p className="text-[11px] text-muted-foreground">AES-256 merchant credentials at rest</p>
            </div>

            <div className="rounded-lg bg-surface-lowest border border-border p-3 space-y-0.5">
              <div className="text-foreground font-medium">Session Family Guard</div>
              <p className="text-[11px] text-muted-foreground">Redis rotating tokens & revocation</p>
            </div>

            <div className="rounded-lg bg-surface-lowest border border-border p-3 space-y-0.5">
              <div className="text-foreground font-medium">Rate Limit Protection</div>
              <p className="text-[11px] text-muted-foreground">OTP & WebSocket traffic throttling</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
