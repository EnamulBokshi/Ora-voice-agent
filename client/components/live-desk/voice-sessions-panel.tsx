'use client';

import type { LiveVoiceSession } from '@/services/live-desk-service';

interface VoiceSessionsPanelProps {
  sessions?: LiveVoiceSession[] | null;
}

export function VoiceSessionsPanel({ sessions }: VoiceSessionsPanelProps) {
  const activeCount = sessions?.length ?? 0;

  return (
    <div className="overflow-hidden bg-transparent">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h3 className="text-[12px] font-mono font-semibold uppercase tracking-wider text-foreground">
            Active Calls
          </h3>
        </div>
        <span className="text-[10.5px] font-mono text-muted-foreground">
          {activeCount}
        </span>
      </div>

      {/* Sessions list */}
      {!sessions || sessions.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground">
          No calls active
        </div>
      ) : (
        <ul className="p-3 space-y-2 bg-transparent">
          {sessions.map((s, idx) => (
            <li key={s.id || s.name || idx} className="flex items-center justify-between gap-3 p-1.5 rounded-md hover:bg-surface-high/20 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] flex-shrink-0 select-none bg-surface-high border border-border/60 text-foreground"
                >
                  {s.initial}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">
                    {s.name}
                  </p>
                </div>
              </div>

              <div className="text-[10.5px] font-mono text-muted-foreground tabular-nums flex-shrink-0">
                {s.duration}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
