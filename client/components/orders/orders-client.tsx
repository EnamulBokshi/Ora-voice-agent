'use client';

import { MOCK_ORDERS } from '@/components/orders/orders-types';
import { OrdersHeader, OrdersMetrics } from '@/components/orders/orders-header';
import { OrdersTable } from '@/components/orders/orders-table';

export function OrdersClient() {
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <OrdersHeader />

      {/* 4 KPI Metrics */}
      <OrdersMetrics />

      {/* Orders Table & Detail Drawer */}
      <OrdersTable orders={MOCK_ORDERS} />
    </div>
  );
}
