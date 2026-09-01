'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Radio, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { TopHeader } from '@/components/dashboard/top-header';
import { ActivityFeed } from './activity-feed';
import { OraStatusPanel } from './ora-status-panel';
import { VoiceSessionsPanel } from './voice-sessions-panel';
import { SalesActionsPanel } from './sales-actions-panel';
import { SessionDetailPanel } from './session-detail-panel';
import {
  getLiveStatsApi,
  getActivityFeedApi,
  getVoiceSessionsApi,
  getSalesConversionsApi,
  getSystemHealthApi,
  type LiveStatsResponse,
  type LiveFeedSession,
  type LiveVoiceSession,
  type LiveSalesAction,
  type SystemHealthResponse,
} from '@/services/live-desk-service';
import {
  demoLiveStats,
  demoLiveFeed,
  demoLiveVoiceSessions,
  demoLiveSalesActions,
  demoSystemHealth,
} from '@/lib/demo-live-desk';
import { DEMO_MODE_ENABLED } from '@/lib/demo-config';

const USE_DEMO_DATA = DEMO_MODE_ENABLED;

export function LiveDeskClient() {
  const [paused, setPaused]               = useState(false);
  const [activeSession, setActiveSession] = useState<LiveFeedSession | null>(null);

  const [stats, setStats]                 = useState<LiveStatsResponse | null>(null);
  const [feed, setFeed]                   = useState<LiveFeedSession[]>([]);
  const [voiceSessions, setVoiceSessions] = useState<LiveVoiceSession[]>([]);
  const [salesActions, setSalesActions]   = useState<LiveSalesAction[]>([]);
  const [health, setHealth]               = useState<SystemHealthResponse | null>(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      const [statsRes, feedRes, voiceRes, salesRes, healthRes] =
        await Promise.allSettled([
          getLiveStatsApi(),
          getActivityFeedApi(20),
          getVoiceSessionsApi(),
          getSalesConversionsApi(),
          getSystemHealthApi(),
        ]);

      // ── Process Feed ───────────────────────────────────────────────────────
      const rawFeed = feedRes.status === 'fulfilled' ? feedRes.value : [];
      const effectiveFeed =
        USE_DEMO_DATA && (!rawFeed || rawFeed.length === 0)
          ? demoLiveFeed
          : rawFeed;
      setFeed(effectiveFeed);

      // Auto-select first session if none is selected yet
      setActiveSession((prev) => {
        if (prev) return prev;
        return effectiveFeed.length > 0 ? effectiveFeed[0] : null;
      });

      // ── Process Stats ──────────────────────────────────────────────────────
      const rawStats = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const effectiveStats =
        USE_DEMO_DATA && (!rawStats || rawStats.activeConvos === 0)
          ? demoLiveStats
          : rawStats;
      setStats(effectiveStats);

      // ── Process Voice Sessions ─────────────────────────────────────────────
      const rawVoice = voiceRes.status === 'fulfilled' ? voiceRes.value : [];
      const effectiveVoice =
        USE_DEMO_DATA && (!rawVoice || rawVoice.length === 0)
          ? demoLiveVoiceSessions
          : rawVoice;
      setVoiceSessions(effectiveVoice);

      // ── Process Sales Conversions ──────────────────────────────────────────
      const rawSales = salesRes.status === 'fulfilled' ? salesRes.value : [];
      const effectiveSales =
        USE_DEMO_DATA && (!rawSales || rawSales.length === 0)
          ? demoLiveSalesActions
          : rawSales;
      setSalesActions(effectiveSales);

      // ── Process Health ─────────────────────────────────────────────────────
      const rawHealth = healthRes.status === 'fulfilled' ? healthRes.value : null;
      const effectiveHealth =
        USE_DEMO_DATA && (!rawHealth || !rawHealth.services?.length)
          ? demoSystemHealth
          : rawHealth;
      setHealth(effectiveHealth);

    } catch {
      // In error state, fall back to demo data if enabled
      if (USE_DEMO_DATA) {
        setFeed(demoLiveFeed);
        setStats(demoLiveStats);
        setVoiceSessions(demoLiveVoiceSessions);
        setSalesActions(demoLiveSalesActions);
        setHealth(demoSystemHealth);
        setActiveSession((prev) => prev ?? demoLiveFeed[0]);
      }
    }
  }, []);

  useEffect(() => { fetchTelemetry(); }, [fetchTelemetry]);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(fetchTelemetry, 4000);
    return () => clearInterval(interval);
  }, [paused, fetchTelemetry]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">

      {/* ── Top Header ── */}
      <TopHeader
        title="Live Desk"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-surface-high text-foreground border border-border select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] animate-pulse-ring" />
            Live Stream
          </span>
        }
        actions={
          <div className="flex items-center gap-4 text-[12px]">
            {/* Inline live metrics — no box pills */}
            <div className="hidden md:flex items-center gap-3 text-muted-foreground">
              <span>
                <strong className="font-semibold text-foreground font-mono">{stats?.activeConvos ?? 0}</strong> active
              </span>
              <span className="text-border">·</span>
              <span>
                <strong className="font-semibold text-foreground font-mono">{stats?.activeVoiceCalls ?? 0}</strong> voice
              </span>
              <span className="text-border">·</span>
              <span>
                <strong className="font-semibold text-foreground font-mono">{stats?.ordersInfluenced ?? 0}</strong> orders
              </span>
            </div>

            <div className="hidden md:block h-4 w-px bg-border" />

            {/* Pause / Resume */}
            <button
              id="live-activity-pause-toggle"
              onClick={() => setPaused((p) => !p)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              {paused ? (
                <>
                  <Radio size={12} className="text-primary" />
                  Resume
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  Pause
                </>
              )}
            </button>

            <Link
              href="/agent"
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              <Settings2 size={12} />
              Configure
            </Link>
          </div>
        }
      />

      {/* ── 3-Column Full-Height Workspace ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-border">

        {/* ── Col 1: Activity Feed (300px fixed) ── */}
        <div className="w-[300px] flex-shrink-0 flex flex-col overflow-hidden bg-background">
          <ActivityFeed
            paused={paused}
            sessions={feed}
            activeSessionId={activeSession?.id}
            onSelectSession={setActiveSession}
          />
          {/* Footer link */}
          <div className="px-4 py-2.5 border-t border-border flex-shrink-0">
            <Link
              href="/conversations"
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              View conversation history
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* ── Col 2: Session Detail — inline panel (flex-1) ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
          <SessionDetailPanel session={activeSession} />
        </div>

        {/* ── Col 3: Right sidebar — System + Voice + Sales (260px fixed) ── */}
        <div className="w-[260px] flex-shrink-0 flex flex-col overflow-y-auto no-scrollbar bg-background divide-y divide-border">
          {/* System services */}
          <OraStatusPanel health={health} />

          {/* Voice sessions */}
          <VoiceSessionsPanel sessions={voiceSessions} />

          {/* Sales conversions */}
          <SalesActionsPanel actions={salesActions} />
        </div>

      </div>
    </div>
  );
}
