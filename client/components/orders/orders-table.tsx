'use client';

import { useState } from 'react';
import { OrderRecord, OrderStatus } from '@/components/orders/orders-types';
import { OrderDetailDrawer } from '@/components/orders/order-detail-drawer';
import { OrdersToolbar } from './subcomponents/orders-toolbar';
import { OrdersTableRow } from './subcomponents/orders-table-row';

interface OrdersTableProps {
  orders: OrderRecord[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus !== 'all' && o.status !== selectedStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden backdrop-blur-md"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Search & Filter Toolbar */}
      <OrdersToolbar
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {/* Orders Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b bg-[var(--surface-container)]/50 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-3.5 px-5">ORDER ID</th>
              <th className="py-3.5 px-5">CUSTOMER</th>
              <th className="py-3.5 px-5">CHANNEL</th>
              <th className="py-3.5 px-5">PRODUCTS</th>
              <th className="py-3.5 px-5 text-right">TOTAL</th>
              <th className="py-3.5 px-5 text-center">STATUS</th>
              <th className="py-3.5 px-5">DATE</th>
              <th className="py-3.5 px-5 text-right">ACTION</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--glass-border)] text-foreground">
            {filteredOrders.map((order) => (
              <OrdersTableRow
                key={order.id}
                order={order}
                onSelectOrder={setSelectedOrder}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer modal */}
      {selectedOrder && (
        <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
