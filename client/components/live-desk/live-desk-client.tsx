'use client';

import { useState } from 'react';
import { Settings2, ArrowRight, Radio } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { LiveTopBar } from './live-top-bar';
import { LiveStatsBar } from './live-stats-bar';
import { ActivityFeed, type FeedSession } from './activity-feed';
import { OraStatusPanel } from './ora-status-panel';
import { VoiceSessionsPanel } from './voice-sessions-panel';
import { SalesActionsPanel } from './sales-actions-panel';
import { DetailDrawer } from './detail-drawer';

export function LiveDeskClient() {
  const [paused, setPaused] = useState(false);
  const [activeSession, setActiveSession] = useState<FeedSession | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleSelectSession(session: FeedSession) {
    setActiveSession(session);
    setDrawerOpen(true);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* ── Top Bar with Live Indicator & Controls ── */}
      <LiveTopBar
        paused={paused}
        onTogglePause={() => setPaused((prev) => !prev)}
      />

      {/* ── Main Scrollable Canvas ── */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 max-w-[1440px] w-full mx-auto">

        {/* Page Heading & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--status-online)] flex items-center gap-1.5">
                <Radio size={13} className="text-[color:var(--status-online)] animate-pulse" />
                Live Desk
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight leading-tight">
              Real-Time Customer Activity
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Live shopper conversations, voice calls, product inquiries, and assisted checkouts.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/conversations"
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'gap-1.5 text-[12px] border-border bg-surface-container hover:bg-surface-high',
              })}
            >
              All Conversations
              <ArrowRight size={13} />
            </Link>
            <Link
              href="/agent"
              className={buttonVariants({
                variant: 'default',
                size: 'sm',
                className: 'gap-1.5 text-[12px] bg-primary text-primary-foreground hover:bg-primary-hover font-semibold',
              })}
            >
              <Settings2 size={13} />
              Configure Agent
            </Link>
          </div>
        </div>

        {/* ── Row 1: Real-Time Dynamic Stat Counters ── */}
        <LiveStatsBar paused={paused} />

        {/* ── Row 2: Two-Column Live Activity Workspace ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Customer Activity Feed (8 Cols) */}
          <div className="xl:col-span-8 space-y-4">
            <ActivityFeed
              paused={paused}
              activeSessionId={activeSession?.id}
              onSelectSession={handleSelectSession}
            />

            <div className="flex items-center justify-between px-2 text-[12px] text-muted-foreground">
              <span>Click on any active shopper session to inspect live transcript & verification.</span>
              <Link
                href="/conversations"
                className="text-primary hover:underline underline-offset-4 font-medium inline-flex items-center gap-1"
              >
                View full history
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Right Column: Live Telemetry Panels (4 Cols) */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            {/* Active Voice Calls with 7-bar audio waveform */}
            <VoiceSessionsPanel />

            {/* AI Sales Conversion Actions */}
            <SalesActionsPanel />

            {/* System Status Indicators */}
            <OraStatusPanel />
          </div>
        </div>

      </div>

      {/* ── Slide-in Interactive Session Detail Drawer ── */}
      <DetailDrawer
        open={drawerOpen}
        session={activeSession}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
