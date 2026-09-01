'use client';

import { Radio } from 'lucide-react';
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-surface-lowest">
        <h2 className="text-[13px] font-semibold text-foreground">Live Feed</h2>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              paused
                ? 'bg-muted-foreground'
                : 'bg-[color:var(--status-online)] animate-pulse-ring',
            )}
          />
          {paused ? 'Paused' : 'Active'}
        </div>
      </div>

      {/* Feed list — clean Intercom inbox list */}
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/30">
        {items.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">No active sessions</p>
            <p className="text-[11.5px] text-muted-foreground/60">
              Customer conversations will appear here in real time.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = activeSessionId === item.id || activeSessionId === item.sessionId;
            const isVoice = item.channel?.toLowerCase().includes('voice');

            return (
              <button
                key={item.id || item.sessionId}
                id={`feed-item-${item.id}`}
                onClick={() => onSelectSession(item)}
                className={cn(
                  'w-full text-left flex gap-3 items-start px-4 py-3 transition-colors cursor-pointer group',
                  isSelected
                    ? 'bg-surface-high/80 border-l-2 border-l-foreground pl-3.5'
                    : 'hover:bg-surface-high/30',
                )}
              >
                {/* Avatar Initial */}
                <div className="w-7 h-7 rounded-full bg-surface-high border border-border flex items-center justify-center font-medium text-[11px] text-foreground flex-shrink-0 mt-0.5 select-none">
                  {item.initial}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[12.5px] font-medium text-foreground truncate">
                        {item.name}
                      </span>
                      {isVoice && (
                        <Radio size={11} className="text-primary flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[10.5px] text-muted-foreground font-mono tabular-nums flex-shrink-0">
                      {item.time}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-muted-foreground line-clamp-1 group-hover:text-foreground/90 transition-colors">
                    {item.message}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
