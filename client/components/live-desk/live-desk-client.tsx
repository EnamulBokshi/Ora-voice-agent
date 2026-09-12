'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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
import { AppLink } from '@/components/navigation/app-link';

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
          // Reflects the polling state. This was hardcoded to "Live" with a green dot
          // and stayed that way after the merchant hit Pause.
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-[10.5px] font-bold tracking-wider uppercase bg-surface-high text-foreground border border-border/60 select-none font-mono">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-none',
                paused ? 'bg-muted-foreground' : 'bg-[color:var(--status-online)]',
              )}
            />
            {paused ? 'Paused' : 'Live'}
          </span>
        }
        actions={
          <div className="flex items-center gap-4 text-[12px]">
            {/* Inline live metrics — voice agent only */}
            <div className="hidden md:flex items-center gap-3 text-muted-foreground font-mono text-[11.5px]">
              {/* An em dash when telemetry is unavailable. These used to default to 2 and 5,
                  so a failed stats call asserted "2 live voice calls · 5 orders assisted"
                  on a real-time monitoring surface. */}
              <span>
                <strong className="font-semibold text-foreground">{stats?.activeVoiceCalls ?? '—'}</strong> live voice calls
              </span>
              <span className="text-border">·</span>
              <span>
                <strong className="font-semibold text-foreground">{stats?.ordersInfluenced ?? '—'}</strong> orders assisted
              </span>
            </div>

            <div className="hidden md:block h-4 w-px bg-border/40" />

            {/* Pause / Resume */}
            <button
              id="live-activity-pause-toggle"
              onClick={() => setPaused((p) => !p)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              <span>{paused ? 'Resume' : 'Pause'}</span>
            </button>

            <AppLink
              href="/agent"
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              <Settings2 size={12} />
              <span>Settings</span>
            </AppLink>
          </div>
        }
      />

      {/*
        3-column workspace from lg up; a single scrolling column below that.
        This was three fixed widths (280 / flex-1 / 250) with no responsive class, so
        530px of the row was committed before content and the centre transcript column
        collapsed to nothing on a phone.
      */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border/40 bg-transparent">

        {/* ── Col 1: Active Shoppers Feed ── */}
        <div className="w-full lg:w-[280px] lg:flex-shrink-0 flex flex-col lg:overflow-hidden bg-transparent">
          <ActivityFeed
            paused={paused}
            sessions={feed}
            activeSessionId={activeSession?.id}
            onSelectSession={setActiveSession}
          />
          {/* Footer link to Historical Archives */}
          <div className="px-4 py-2.5 border-t border-border/40 flex-shrink-0 bg-transparent">
            <AppLink
              href="/conversations"
              className="text-[11.5px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 font-medium"
            >
              <span>View all conversations</span>
              <ArrowRight size={11} />
            </AppLink>
          </div>
        </div>

        {/* ── Col 2: Chat Transcript & Actions ── */}
        <div className="w-full lg:flex-1 flex flex-col min-w-0 lg:overflow-hidden bg-transparent">
          <SessionDetailPanel session={activeSession} />
        </div>

        {/* ── Col 3: Right Sidebar — Conversions & Services ── */}
        <div className="w-full lg:w-[250px] lg:flex-shrink-0 flex flex-col lg:overflow-y-auto no-scrollbar bg-transparent divide-y divide-border/40">
          {/* Live Conversions */}
          <SalesActionsPanel actions={salesActions} />

          {/* Active Voice Calls */}
          <VoiceSessionsPanel sessions={voiceSessions} />

          {/* System Services Health */}
          <OraStatusPanel health={health} />
        </div>

      </div>
    </div>
  );
}
