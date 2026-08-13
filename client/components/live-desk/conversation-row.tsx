'use client';

import { Eye, ArrowUpRight, X, Mic, MessageSquare, Globe } from 'lucide-react';
import { StatusPill, ConversationStatus } from './status-pill';
import { cn } from '@/lib/utils';

export type ConversationChannel = 'voice' | 'widget' | 'chat';

export interface ConversationRowData {
  id: string;
  customerName: string;
  customerInitials: string;
  sessionStart: string;
  channel: ConversationChannel;
  intent: string;
  waitTime: string;
  status: ConversationStatus;
}

interface ConversationRowProps {
  row: ConversationRowData;
  className?: string;
}

const channelConfig: Record<
  ConversationChannel,
  { icon: React.ReactNode; label: string; bg: string; text: string }
> = {
  voice: {
    icon: <Mic size={11} />,
    label: 'Voice',
    bg: 'bg-[color:var(--status-processing)]/10',
    text: 'text-[color:var(--status-processing)]',
  },
  widget: {
    icon: <Globe size={11} />,
    label: 'Widget',
    bg: 'bg-surface-high',
    text: 'text-muted-foreground',
  },
  chat: {
    icon: <MessageSquare size={11} />,
    label: 'Chat',
    bg: 'bg-primary/10',
    text: 'text-primary',
  },
};

export function ConversationRow({ row, className }: ConversationRowProps) {
  const ch = channelConfig[row.channel] ?? channelConfig.widget;

  return (
    <tr className={cn('border-b border-border hover:bg-surface-high transition-colors group', className)}>
      {/* Shopper */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center select-none flex-shrink-0 uppercase">
            {row.customerInitials}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground leading-none truncate">
              {row.customerName}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{row.sessionStart}</p>
          </div>
        </div>
      </td>

      {/* Channel */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold',
            ch.bg,
            ch.text,
          )}
        >
          {ch.icon}
          {ch.label}
        </span>
      </td>

      {/* What they asked */}
      <td className="px-4 py-3 max-w-[220px]">
        <p className="text-[13px] text-foreground truncate">{row.intent}</p>
      </td>

      {/* Wait */}
      <td className="px-4 py-3 tabular-nums">
        <p className="text-[13px] text-muted-foreground">{row.waitTime}</p>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusPill status={row.status} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            aria-label="View conversation"
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-highest transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            aria-label="Escalate conversation"
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-[color:var(--status-warning)] hover:bg-[color:var(--status-warning)]/10 transition-colors"
          >
            <ArrowUpRight size={14} />
          </button>
          <button
            aria-label="End conversation"
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-[color:var(--status-error)] hover:bg-[color:var(--status-error)]/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
