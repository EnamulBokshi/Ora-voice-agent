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
  active:    { dot: 'bg-emerald-400', text: 'text-foreground',       label: 'Active' },
  ended:     { dot: 'bg-zinc-500',    text: 'text-muted-foreground', label: 'Ended' },
  escalated: { dot: 'bg-rose-400',    text: 'text-rose-400',         label: 'Escalated' },
  idle:      { dot: 'bg-zinc-500',    text: 'text-muted-foreground', label: 'Idle' },
};

export function RecentConversationsTable({ conversations }: RecentConversationsTableProps) {
  if (conversations.length === 0) {
    return (
      <div className="py-10 text-center text-[12px] text-muted-foreground">
        No customer conversations recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
            <th className="py-2 px-2 text-left font-medium">Session</th>
            <th className="py-2 px-2 text-left font-medium">Channel</th>
            <th className="py-2 px-2 text-left font-medium">Status</th>
            <th className="py-2 px-2 text-right font-medium">Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {conversations.slice(0, 5).map((conv) => {
            const cs = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.ended;
            return (
              <tr
                key={conv._id}
                className="hover:bg-surface-high/40 transition-colors"
              >
                <td className="py-2.5 px-2 font-mono text-[11.5px] text-foreground">
                  {conv.sessionId.slice(0, 10)}…
                </td>
                <td className="py-2.5 px-2 text-[11.5px] text-muted-foreground capitalize">
                  {channelLabel(conv.channel)}
                </td>
                <td className="py-2.5 px-2">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cs.dot)} />
                    <span className={cs.text}>{cs.label}</span>
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right text-muted-foreground font-mono text-[11px]">
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
