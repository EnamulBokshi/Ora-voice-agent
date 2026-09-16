'use client';

import { cn } from '@/lib/utils';
import type { LiveFeedSession } from '@/services/live-desk-service';

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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between flex-shrink-0 bg-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-foreground">
            Active Shoppers
          </h2>
          <span className="text-[11px] text-muted-foreground tabular-nums">({items.length})</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              paused
                ? 'bg-muted-foreground'
                : 'bg-[color:var(--status-online)]',
            )}
          />
          <span>{paused ? 'Paused' : 'Live'}</span>
        </div>
      </div>

      {/* Clean list */}
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/30">
        {items.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No active sessions</p>
          </div>
        ) : (
          items.map((item, idx) => {
            const isSelected = activeSessionId === item.id || activeSessionId === item.sessionId;
            const isVoice = item.channel?.toLowerCase().includes('voice');

            return (
              <button
                key={item.id || item.sessionId || idx}
                id={`feed-item-${item.id}`}
                onClick={() => onSelectSession(item)}
                className={cn(
                  'w-full text-left flex flex-col gap-1 px-4 py-3 transition-colors cursor-pointer group bg-transparent',
                  isSelected
                    ? 'bg-surface-high/50 border-l-2 border-l-foreground pl-3.5'
                    : 'hover:bg-surface-high/20',
                )}
              >
                {/* Top Row: Name + Channel + Time */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-surface-high border border-border/60 flex items-center justify-center font-bold text-[10px] text-foreground flex-shrink-0 select-none">
                      {item.initial}
                    </div>
                    <span className="text-[13px] font-medium text-foreground truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="text-[10.5px] text-muted-foreground flex-shrink-0">
                    <span className="tabular-nums">{item.time}</span>
                  </div>
                </div>

                {/* Message snippet */}
                <p className="text-[12px] text-muted-foreground line-clamp-1 group-hover:text-foreground transition-colors leading-snug">
                  {item.message}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
