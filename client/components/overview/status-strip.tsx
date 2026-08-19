'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
    <div className="flex items-center gap-5 py-1 text-[12.5px]">
      {/* Live dot */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--status-online)] opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[color:var(--status-online)]" />
        </span>
        <span className="font-medium text-foreground">ORA Online</span>
      </div>

      <span className="text-border">·</span>

      <span className="text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{activeConversations}</span>{' '}
        active chats
      </span>

      <span className="text-border">·</span>

      <span className="text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{voiceSessions}</span>{' '}
        voice calls
      </span>

      <span className="text-border">·</span>

      <span className="text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{productsCount}</span>{' '}
        catalog items
      </span>

      <Link
        href="/live-desk"
        className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        Open Live Desk
        <ArrowRight size={11} />
      </Link>
    </div>
  );
}
