'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminHeader } from './admin-header';
import { fetchVoiceSessions } from '@/services/admin-service';
import { VoiceSessionItem } from '@/types/admin';
import { Radio, Mic, Clock, Loader2, Volume2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminVoiceMonitorView() {
  const [sessions, setSessions] = useState<VoiceSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchVoiceSessions();
      setSessions(res.sessions);
    } catch (err) {
      console.error('Failed to fetch voice sessions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 15000); // 15s auto-poll for live voice telemetry
    return () => clearInterval(interval);
  }, [loadData]);

  const activeCount = sessions.filter((s) => s.status === 'active').length;

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Live AI Voice Telemetry & Monitor"
        description="Cross-merchant voice stream gateway, active conversation turn counters, and latency telemetry."
        onRefresh={() => loadData(true)}
        isRefreshing={refreshing}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Voice Gateway Status Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-primary/30 bg-surface-container p-5 shadow-lg shadow-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Gemini Live Voice Gateway</h2>
                <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/40">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Streaming bidirectional PCM16 audio via Native Audio Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="rounded-lg bg-surface-high px-3 py-2">
              <span className="text-muted-foreground">ACTIVE STREAMS: </span>
              <span className="font-bold text-primary">{activeCount}</span>
            </div>
            <div className="rounded-lg bg-surface-high px-3 py-2">
              <span className="text-muted-foreground">RECENT SESSIONS: </span>
              <span className="font-bold text-foreground">{sessions.length}</span>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="rounded-xl border border-border bg-surface-container p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Live & Recent Voice Sessions</h3>
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Streaming voice telemetry...</span>
                      </div>
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No active or recorded voice sessions yet.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-high/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-foreground">
                        <div className="flex items-center gap-2">
                          <Volume2 size={13} className="text-primary" />
                          <span>{s.sessionId}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.businessName}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={12} />
                          <span>{s.customerIdentifier}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            s.status === 'active'
                              ? 'bg-primary/20 text-primary border border-primary/40 animate-pulse'
                              : 'bg-surface-high text-muted-foreground border border-border',
                          )}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                        {s.turnCount}
                      </td>

                      <td className="px-4 py-3 text-right text-muted-foreground font-mono text-[11px]">
                        {s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString() : 'N/A'}
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
