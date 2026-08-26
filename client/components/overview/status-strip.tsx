'use client';

import Link from 'next/link';
import { ArrowRight, Radio } from 'lucide-react';

interface StatusStripProps {
  activeConversations?: number;
  voiceSessions?: number;
  productsCount?: number;
}

export function StatusStrip({
  activeConversations = 0,
  voiceSessions = 0,
  productsCount = 0,
}: StatusStripProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border/50 text-[12.5px]">
      {/* Live Status Indicators */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--status-online)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--status-online)]" />
          </span>
          <span className="font-semibold text-foreground tracking-tight">ORA Online</span>
        </div>

        <span className="text-border/60 hidden sm:inline">·</span>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{activeConversations}</span>
          <span>active chats</span>
        </div>

        <span className="text-border/60 hidden sm:inline">·</span>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{voiceSessions}</span>
          <span>voice calls</span>
        </div>

        <span className="text-border/60 hidden sm:inline">·</span>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{productsCount.toLocaleString()}</span>
          <span>catalog items in sync</span>
        </div>
      </div>

      {/* Jump to Live Operations */}
      <Link
        href="/live-desk"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:underline underline-offset-4 transition-colors ml-auto sm:ml-0"
      >
        <Radio size={12} className="text-foreground dark:text-[#C8F031]" />
        <span>Live Desk Telemetry</span>
        <ArrowRight size={11} className="text-muted-foreground" />
      </Link>
    </div>
  );
}
