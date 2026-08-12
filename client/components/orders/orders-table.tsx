'use client';

import { useState } from 'react';
import { Order } from '@/services/orders-service';
import { OrderDetailDrawer } from '@/components/orders/order-detail-drawer';
import { OrdersToolbar } from './subcomponents/orders-toolbar';
import { OrdersTableRow } from './subcomponents/orders-table-row';
import { formatCurrency } from '@/lib/format';

interface OrdersTableProps {
  orders: Order[];
  onReload: () => void;
}

export function OrdersTable({ orders, onReload }: OrdersTableProps) {
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | Order['status']>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus !== 'all' && o.status !== selectedStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="rounded-md border border-border bg-surface-container overflow-hidden">
      <OrdersToolbar
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {filteredOrders.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-muted-foreground">
          {orders.length === 0
            ? 'No orders yet. Orders created by ORA from widget conversations will appear here.'
            : 'No orders match your filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[11px] tracking-wider font-medium">
                <th className="py-3 px-5">Order</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5 text-right">Total</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border text-foreground">
              {filteredOrders.map((order) => (
                <OrdersTableRow
                  key={order._id}
                  order={order}
                  onSelectOrder={setSelectedOrder}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdated={onReload}
        />
      )}
    </div>
  );
}
