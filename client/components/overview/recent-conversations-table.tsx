'use client';

import { cn } from '@/lib/utils';

export interface RecentConversation {
  _id: string;
  sessionId: string;
  channel: string;
  status: string;
  lastActivityAt?: string;
  createdAt: string;
}

interface RecentConversationsTableProps {
  conversations: RecentConversation[];
}

function channelLabel(raw: string): string {
  return raw.replace('widget_', '').replace(/_/g, ' ');
}

const STATUS_CONFIG: Record<string, { dot: string; text: string; label: string }> = {
  active: { dot: 'bg-[color:var(--status-online)]', text: 'text-foreground', label: 'Active' },
  ended: { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', label: 'Ended' },
  escalated: { dot: 'bg-red-400', text: 'text-red-400', label: 'Escalated' },
  idle: { dot: 'bg-muted-foreground/30', text: 'text-muted-foreground', label: 'Idle' },
};

export function RecentConversationsTable({ conversations }: RecentConversationsTableProps) {
  if (conversations.length === 0) {
    return (
      <div className="py-12 text-center text-[12.5px] text-muted-foreground">
        No customer conversations recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground text-[11px] font-mono uppercase tracking-wider">
            <th className="py-2.5 px-2 text-left font-medium">Session ID</th>
            <th className="py-2.5 px-2 text-left font-medium">Channel</th>
            <th className="py-2.5 px-2 text-left font-medium">Status</th>
            <th className="py-2.5 px-2 text-right font-medium">Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {conversations.slice(0, 5).map((conv) => {
            const cs = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.ended;
            return (
              <tr
                key={conv._id}
                className="hover:bg-surface-high/30 transition-colors"
              >
                <td className="py-3 px-2 font-mono text-[12px] text-foreground font-medium">
                  {conv.sessionId.slice(0, 12)}…
                </td>
                <td className="py-3 px-2 text-[12px] text-muted-foreground capitalize">
                  <span className="px-1.5 py-0.5 rounded bg-surface-high border border-border/40 text-[11px] font-medium text-foreground">
                    {channelLabel(conv.channel)}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cs.dot)} />
                    <span className={cs.text}>{cs.label}</span>
                  </span>
                </td>
                <td className="py-3 px-2 text-right text-muted-foreground font-mono text-[11px]">
                  {new Date(conv.lastActivityAt || conv.createdAt).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
