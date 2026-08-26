'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

export interface RecentOrder {
  _id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency?: string;
  createdAt: string;
}

interface RecentOrdersTableProps {
  orders: RecentOrder[];
}

const STATUS_CONFIG: Record<string, { dot: string; label: string; text: string }> = {
  confirmed: { dot: 'bg-[color:var(--status-online)]', text: 'text-foreground', label: 'Confirmed' },
  pending: { dot: 'bg-amber-400', text: 'text-foreground', label: 'Pending' },
  shipped: { dot: 'bg-sky-400', text: 'text-foreground', label: 'Shipped' },
  delivered: { dot: 'bg-[color:var(--status-online)]', text: 'text-foreground', label: 'Delivered' },
  canceled: { dot: 'bg-red-400', text: 'text-muted-foreground', label: 'Canceled' },
};

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="py-12 text-center text-[12.5px] text-muted-foreground">
        No recent customer orders recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground text-[11px] font-mono uppercase tracking-wider">
            <th className="py-2.5 px-2 text-left font-medium">Order ID</th>
            <th className="py-2.5 px-2 text-left font-medium">Status</th>
            <th className="py-2.5 px-2 text-right font-medium">Amount</th>
            <th className="py-2.5 px-2 text-right font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {orders.slice(0, 5).map((order) => {
            const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            return (
              <tr
                key={order._id}
                className="hover:bg-surface-high/30 transition-colors"
              >
                <td className="py-3 px-2 font-mono text-foreground font-medium text-[12px]">
                  {order.orderNumber}
                </td>
                <td className="py-3 px-2">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot)} />
                    <span className={sc.text}>{sc.label}</span>
                  </span>
                </td>
                <td className="py-3 px-2 text-right tabular-nums text-foreground font-semibold font-mono text-[12px]">
                  {formatCurrency(order.totalAmount, order.currency)}
                </td>
                <td className="py-3 px-2 text-right text-muted-foreground font-mono text-[11px]">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
