'use client';

import { ChevronRight } from 'lucide-react';
import { Order } from '@/services/orders-service';
import { OrderStatusBadge } from './orders-status-badges';
import { formatCurrency } from '@/lib/format';

interface OrdersTableRowProps {
  order: Order;
  onSelectOrder: (order: Order) => void;
}

export function OrdersTableRow({ order, onSelectOrder }: OrdersTableRowProps) {
  const o = order;

  return (
    <tr
      onClick={() => onSelectOrder(o)}
      className="hover:bg-surface-high cursor-pointer transition-colors"
    >
      <td className="py-3.5 px-5 font-mono font-medium text-foreground">{o.orderNumber}</td>

      <td className="py-3.5 px-5 font-medium text-foreground max-w-[260px] truncate">
        {o.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
      </td>

      <td className="py-3.5 px-5 text-right font-medium tabular-nums text-foreground">
        {formatCurrency(o.totalAmount, o.currency)}
      </td>

      <td className="py-3.5 px-5 text-center">
        <OrderStatusBadge status={o.status} />
      </td>

      <td className="py-3.5 px-5 text-muted-foreground text-[12px]">
        {new Date(o.createdAt).toLocaleDateString()}
      </td>

      <td className="py-3.5 px-5 text-right">
        <ChevronRight size={16} className="inline text-muted-foreground" />
      </td>
    </tr>
  );
}
