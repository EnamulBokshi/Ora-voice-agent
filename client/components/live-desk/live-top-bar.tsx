'use client';

import { Pause, Play, Bell, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { AppLink } from '@/components/navigation/app-link';

interface LiveTopBarProps {
  paused: boolean;
  onTogglePause: () => void;
}

export function LiveTopBar({ paused, onTogglePause }: LiveTopBarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface-lowest flex-shrink-0 gap-4">
      {/* Left: Breadcrumbs + LIVE badge */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span>My Store</span>
          <ChevronRight size={12} />
          <span className="text-foreground font-medium">Live Desk</span>
        </div>

        {/* Pulsing LIVE badge */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-destructive/10 text-destructive border border-destructive/20 select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse-ring" />
          LIVE
        </span>
      </div>

      {/* Center: Quick search */}
      <div className="hidden md:block flex-1 max-w-sm relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search live sessions, intent, shoppers..."
          aria-label="Search live activity"
          className="w-full h-8 pl-7 pr-12 rounded-md border border-border bg-surface-low text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono bg-surface-high px-1 py-0.5 rounded border border-border">
          ⌘K
        </span>
      </div>

      {/* Right: Controls & Actions */}
      <div className="flex items-center gap-2">
        {/* Pause / Resume Button */}
        <button
          id="live-activity-pause-toggle"
          onClick={onTogglePause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border border-border bg-surface-container hover:bg-surface-high text-foreground transition-colors"
        >
          {paused ? (
            <>
              <Play size={13} className="text-primary fill-primary" />
              <span>Resume Feed</span>
            </>
          ) : (
            <>
              <Pause size={13} className="text-muted-foreground" />
              <span>Pause Live</span>
            </>
          )}
        </button>

        {/* Notifications */}
        <AppLink
          href="/notifications"
          id="live-top-notifications"
          aria-label="Notifications"
          className="relative w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high border border-transparent hover:border-border transition-colors"
        >
          <Bell size={15} />
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 rounded-full bg-[color:var(--status-warning)] text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none select-none">
            3
          </span>
        </AppLink>
      </div>
    </header>
  );
}
