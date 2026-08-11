'use client';

import { useState } from 'react';
import { LiveTopBar }          from './live-top-bar';
import { LiveStatsBar }        from './live-stats-bar';
import { ActivityFeed, type FeedSession } from './activity-feed';
import { OraStatusPanel }      from './ora-status-panel';
import { VoiceSessionsPanel }  from './voice-sessions-panel';
import { SalesActionsPanel }   from './sales-actions-panel';
import { DetailDrawer }        from './detail-drawer';

export function LiveActivityClient() {
  const [paused,  setPaused]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<FeedSession | null>(null);

  function handleSelectSession(s: FeedSession) {
    setActiveSession(s);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Custom top bar with LIVE badge */}
      <LiveTopBar paused={paused} onTogglePause={() => setPaused((p) => !p)} />

      {/* Scrollable page content */}
      <div className="flex-1 overflow-y-auto p-10">
        {/* Row 1: Real-time stat counters */}
        <LiveStatsBar paused={paused} />

        {/* Row 2: Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left — Activity feed (8 cols) */}
          <div className="lg:col-span-8">
            <ActivityFeed paused={paused} onSelectSession={handleSelectSession} />
          </div>

          {/* Right — Status panels (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <OraStatusPanel />
            <VoiceSessionsPanel />
            <SalesActionsPanel />
          </div>
        </div>
      </div>

      {/* Slide-in detail drawer (absolute, inside this container) */}
      <DetailDrawer
        open={drawerOpen}
        session={activeSession}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
