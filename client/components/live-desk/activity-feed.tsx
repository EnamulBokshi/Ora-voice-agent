'use client';

import { Activity, Radio, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiveFeedSession, StateType } from '@/services/live-desk-service';

export type { LiveFeedSession as FeedSession, StateType };

const STATE_STYLES: Record<
  StateType,
  { borderClass: string; chipBgClass: string; chipTextClass: string; dotClass: string }
> = {
  searching: {
    borderClass: 'border-l-primary',
    chipBgClass: 'bg-primary/10',
    chipTextClass: 'text-primary',
    dotClass: 'bg-primary',
  },
  comparing: {
    borderClass: 'border-l-[color:var(--chart-3)]',
    chipBgClass: 'bg-secondary/20',
    chipTextClass: 'text-foreground',
    dotClass: 'bg-[color:var(--chart-3)]',
  },
  cart: {
    borderClass: 'border-l-[color:var(--status-online)]',
    chipBgClass: 'bg-[color:var(--status-online)]/10',
    chipTextClass: 'text-[color:var(--status-online)]',
    dotClass: 'bg-[color:var(--status-online)]',
  },
  checking: {
    borderClass: 'border-l-[color:var(--chart-4)]',
    chipBgClass: 'bg-[color:var(--chart-4)]/10',
    chipTextClass: 'text-muted-foreground',
    dotClass: 'bg-[color:var(--chart-4)]',
  },
  idle: {
    borderClass: 'border-l-border',
    chipBgClass: 'bg-surface-high',
    chipTextClass: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
};

const AVATAR_COLORS = [
  { bg: 'bg-primary/15 text-primary' },
  { bg: 'bg-[color:var(--status-online)]/15 text-[color:var(--status-online)]' },
  { bg: 'bg-foreground/10 text-foreground' },
  { bg: 'bg-[color:var(--chart-4)]/20 text-muted-foreground' },
];

interface ActivityFeedProps {
  paused: boolean;
  sessions?: LiveFeedSession[] | null;
  activeSessionId?: string;
  onSelectSession: (s: LiveFeedSession) => void;
}

export function ActivityFeed({
  paused,
  sessions,
  activeSessionId,
  onSelectSession,
}: ActivityFeedProps) {
  const items = sessions ?? [];

  return (
    <div className="rounded-md border border-border bg-surface-container overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <h2 className="text-[13px] font-semibold text-foreground">Live Customer Activity</h2>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            paused
              ? 'bg-surface-high text-muted-foreground'
              : 'bg-[color:var(--status-active)]/10 text-[color:var(--status-active)]',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              paused
                ? 'bg-muted-foreground'
                : 'bg-[color:var(--status-active)] animate-pulse-ring',
            )}
          />
          {paused ? 'Paused' : 'Streaming'}
        </span>
      </div>

      {/* Feed list */}
      <div className="p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">No recent shopper activity</p>
            <p>Customer chats and voice inquiries on your storefront will appear here live.</p>
          </div>
        ) : (
          items.map((item, index) => {
            const style = STATE_STYLES[item.stateType] || STATE_STYLES.idle;
            const avatar = AVATAR_COLORS[item.avatarIdx % AVATAR_COLORS.length];
            const isTop = index === 0;
            const isSelected = activeSessionId === item.id || activeSessionId === item.sessionId;

            return (
              <button
                key={item.id || item.sessionId}
                id={`feed-item-${item.id}`}
                onClick={() => onSelectSession(item)}
                className={cn(
                  'w-full text-left flex gap-3.5 items-start p-3.5 rounded-md border border-border/80 bg-surface-low/60 hover:bg-surface-high/80 transition-all border-l-4 group text-foreground cursor-pointer',
                  style.borderClass,
                  isSelected && 'ring-1 ring-primary bg-surface-high',
                )}
              >
                {/* Avatar Initial */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 select-none',
                    avatar.bg,
                  )}
                >
                  {item.initial}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[13px] font-semibold text-foreground truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        {item.channel?.includes('Voice') ? (
                          <Radio size={11} className="text-primary" />
                        ) : (
                          <MessageSquareText size={11} className="text-muted-foreground" />
                        )}
                        {item.channel}
                      </span>
                    </div>

                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-shrink-0 tabular-nums">
                      {isTop && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] animate-pulse-ring" />
                      )}
                      {item.time}
                    </span>
                  </div>

                  <p className="text-[12px] text-muted-foreground mb-2 line-clamp-1 group-hover:text-foreground/90 transition-colors">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Action label tag */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-high text-muted-foreground border border-border">
                      {item.actionLabel}
                    </span>

                    {/* State badge */}
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1',
                        style.chipBgClass,
                        style.chipTextClass,
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', style.dotClass)} />
                      {item.stateLabel}
                    </span>

                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                      {item.sessionId}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

