'use client';

import Link from 'next/link';
import { ArrowRight, Radio } from 'lucide-react';

interface StatusStripProps {
  activeConversations?: number;
  voiceSessions?: number;
  productsCount?: number;
  isWidgetActive?: boolean;
  onToggleWidget?: () => void;
  isTogglingWidget?: boolean;
}

export function StatusStrip({
  voiceSessions = 0,
  productsCount = 0,
  isWidgetActive = true,
  onToggleWidget,
  isTogglingWidget = false,
}: StatusStripProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border/50 text-[12.5px] bg-transparent">
      {/* Live Status Indicators — Voice Agent Only */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            {isWidgetActive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--status-online)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--status-online)]" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            )}
          </span>
          <span className="font-semibold text-foreground tracking-tight">
            {isWidgetActive ? 'Voice Agent Online' : 'Voice Agent Paused'}
          </span>

          {onToggleWidget && (
            <button
              type="button"
              onClick={onToggleWidget}
              disabled={isTogglingWidget}
              className={`ml-1 text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                isWidgetActive
                  ? 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface-high'
                  : 'border-emerald-500/40 text-emerald-400 dark:text-primary bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
              title={isWidgetActive ? 'Temporarily pause voice agent on your storefront' : 'Activate voice agent on your storefront'}
            >
              {isTogglingWidget ? 'Updating...' : isWidgetActive ? 'Pause' : 'Resume'}
            </button>
          )}
        </div>

        <span className="text-border/60 hidden sm:inline">·</span>

        <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[12px]">
          <span className="font-semibold text-foreground">{voiceSessions}</span>
          <span>live customer calls</span>
        </div>

        <span className="text-border/60 hidden sm:inline">·</span>

        <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[12px]">
          <span className="font-semibold text-foreground">{productsCount.toLocaleString()}</span>
          <span>products indexed</span>
        </div>
      </div>

      {/* Jump to Live Operations */}
      <Link
        href="/live-desk"
        title="Monitor ongoing voice conversations and shopper interactions in real time"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:underline underline-offset-4 transition-colors ml-auto sm:ml-0"
      >
        <Radio size={12} className="text-foreground dark:text-primary" />
        <span>Live Store Desk</span>
        <ArrowRight size={11} className="text-muted-foreground" />
      </Link>
    </div>
  );
}
