'use client';

import { Pause, Play, ChevronRight, Search } from 'lucide-react';

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
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-surface-high px-1 py-0.5 rounded border border-border">
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
      </div>
    </header>
  );
}
