'use client';

import { Mic, MessageSquare, Monitor, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { OrderChannel, OrderStatus } from '../orders-types';

interface OrderChannelBadgeProps {
  channel: OrderChannel;
}

export function OrderChannelBadge({ channel }: OrderChannelBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
      style={{
        background:
          channel === 'Voice AI'
            ? 'color-mix(in srgb, var(--primary) 12%, transparent)'
            : channel === 'Chat Assistant'
            ? 'color-mix(in srgb, var(--secondary) 12%, transparent)'
            : 'color-mix(in srgb, var(--chart-3) 12%, transparent)',
        borderColor:
          channel === 'Voice AI'
            ? 'color-mix(in srgb, var(--primary) 25%, transparent)'
            : channel === 'Chat Assistant'
            ? 'color-mix(in srgb, var(--secondary) 25%, transparent)'
            : 'color-mix(in srgb, var(--chart-3) 25%, transparent)',
        color:
          channel === 'Voice AI'
            ? 'var(--primary)'
            : channel === 'Chat Assistant'
            ? 'var(--secondary)'
            : 'var(--chart-3)',
      }}
    >
      {channel === 'Voice AI' ? (
        <Mic size={12} />
      ) : channel === 'Chat Assistant' ? (
        <MessageSquare size={12} />
      ) : (
        <Monitor size={12} />
      )}
      {channel}
    </span>
  );
}

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1"
      style={{
        background:
          status === 'completed'
            ? 'color-mix(in srgb, var(--ora-success) 12%, transparent)'
            : status === 'processing'
            ? 'color-mix(in srgb, var(--primary) 12%, transparent)'
            : status === 'pending'
            ? 'color-mix(in srgb, var(--ora-warning) 12%, transparent)'
            : 'color-mix(in srgb, var(--ora-error) 12%, transparent)',
        borderColor:
          status === 'completed'
            ? 'color-mix(in srgb, var(--ora-success) 25%, transparent)'
            : status === 'processing'
            ? 'color-mix(in srgb, var(--primary) 25%, transparent)'
            : status === 'pending'
            ? 'color-mix(in srgb, var(--ora-warning) 25%, transparent)'
            : 'color-mix(in srgb, var(--ora-error) 25%, transparent)',
        color:
          status === 'completed'
            ? 'var(--ora-success)'
            : status === 'processing'
            ? 'var(--primary)'
            : status === 'pending'
            ? 'var(--ora-warning)'
            : 'var(--ora-error)',
      }}
    >
      {status === 'completed' && <CheckCircle2 size={10} />}
      {status === 'processing' && <RefreshCw size={10} className="animate-spin" />}
      {status === 'pending' && <Clock size={10} />}
      {status === 'refunded' && <AlertTriangle size={10} />}
      {status}
    </span>
  );
}
