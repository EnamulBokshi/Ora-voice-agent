'use client';

import { cn } from '@/lib/utils';

export type ConversationStatus = 'active' | 'awaiting_verify' | 'escalated' | 'idle';

interface StatusPillProps {
  status: ConversationStatus | string;
  className?: string;
}

const statusConfig: Record<
  ConversationStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  active: {
    dot: 'bg-[color:var(--status-active)]',
    bg: 'bg-[color:var(--status-active)]/10',
    text: 'text-[color:var(--status-active)]',
    label: 'Active',
  },
  awaiting_verify: {
    dot: 'bg-[color:var(--status-warning)]',
    bg: 'bg-[color:var(--status-warning)]/10',
    text: 'text-[color:var(--status-warning)]',
    label: 'Awaiting Verify',
  },
  escalated: {
    dot: 'bg-[color:var(--status-error)]',
    bg: 'bg-[color:var(--status-error)]/10',
    text: 'text-[color:var(--status-error)]',
    label: 'Escalated',
  },
  idle: {
    dot: 'bg-[color:var(--status-offline)]',
    bg: 'bg-[color:var(--status-offline)]/10',
    text: 'text-[color:var(--status-offline)]',
    label: 'Idle',
  },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const cfg = statusConfig[status as ConversationStatus] ?? statusConfig.idle;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export type ChannelStatus = 'active' | 'available' | 'degraded' | 'down';

interface ChannelStatusBadgeProps {
  status: ChannelStatus;
  className?: string;
}

const channelConfig: Record<
  ChannelStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  active: {
    dot: 'bg-[color:var(--status-online)]',
    bg: 'bg-[color:var(--status-online)]/10',
    text: 'text-[color:var(--status-online)]',
    label: 'Active',
  },
  available: {
    dot: 'bg-[color:var(--status-active)]',
    bg: 'bg-[color:var(--status-active)]/10',
    text: 'text-[color:var(--status-active)]',
    label: 'Available',
  },
  degraded: {
    dot: 'bg-[color:var(--status-warning)]',
    bg: 'bg-[color:var(--status-warning)]/10',
    text: 'text-[color:var(--status-warning)]',
    label: 'Degraded',
  },
  down: {
    dot: 'bg-[color:var(--status-error)]',
    bg: 'bg-[color:var(--status-error)]/10',
    text: 'text-[color:var(--status-error)]',
    label: 'Down',
  },
};

export function ChannelStatusBadge({ status, className }: ChannelStatusBadgeProps) {
  const cfg = channelConfig[status] ?? channelConfig.available;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
}
