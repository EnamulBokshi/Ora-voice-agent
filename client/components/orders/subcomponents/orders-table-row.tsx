'use client';

import { ChevronRight } from 'lucide-react';
import { OrderRecord } from '../orders-types';
import { OrderChannelBadge, OrderStatusBadge } from './orders-status-badges';

interface OrdersTableRowProps {
  order: OrderRecord;
  onSelectOrder: (order: OrderRecord) => void;
}

export function OrdersTableRow({ order, onSelectOrder }: OrdersTableRowProps) {
  const o = order;

  return (
    <tr
      onClick={() => onSelectOrder(o)}
      className="hover:bg-[var(--surface-high)]/60 cursor-pointer transition-colors group"
    >
      {/* Order ID */}
      <td className="py-4 px-5 font-mono font-bold" style={{ color: 'var(--primary)' }}>
        {o.id}
      </td>

      {/* Customer */}
      <td className="py-4 px-5">
        <p className="font-bold text-foreground">{o.customerName}</p>
        <p className="text-[11px] text-muted-foreground">{o.customerEmail}</p>
      </td>

      {/* Channel Badge */}
      <td className="py-4 px-5">
        <OrderChannelBadge channel={o.channel} />
      </td>

      {/* Products */}
      <td className="py-4 px-5 font-medium text-foreground max-w-[220px] truncate">
        {o.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}
      </td>

      {/* Total */}
      <td className="py-4 px-5 text-right font-mono font-bold text-sm">
        ${o.totalAmount.toFixed(2)}
      </td>

      {/* Status */}
      <td className="py-4 px-5 text-center">
        <OrderStatusBadge status={o.status} />
      </td>

      {/* Date */}
      <td className="py-4 px-5 text-muted-foreground text-[11px]">{o.timestamp}</td>

      {/* Action */}
      <td className="py-4 px-5 text-right">
        <button className="text-muted-foreground group-hover:text-[var(--primary)] transition-colors p-1 rounded-lg">
          <ChevronRight size={16} />
        </button>
      </td>
    </tr>
  );
}
