'use client';

import { Order } from '@/services/orders-service';

interface OrderStatusBadgeProps {
  status: Order['status'];
}

const statusStyles: Record<Order['status'], { bg: string; text: string }> = {
  pending: { bg: 'var(--warning)', text: 'var(--warning-foreground)' },
  confirmed: { bg: 'var(--primary)', text: 'var(--primary-foreground)' },
  shipped: { bg: 'var(--info)', text: 'var(--info-foreground)' },
  delivered: { bg: 'var(--success)', text: 'var(--success-foreground)' },
  canceled: { bg: 'var(--error)', text: 'var(--error-foreground)' },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const style = statusStyles[status] ?? statusStyles.pending;

  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1"
      style={{ background: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
}
