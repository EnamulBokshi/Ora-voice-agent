'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { getOrdersApi, Order } from '@/services/orders-service';
import { demoOrders } from '@/lib/demo-data';
import { OrdersHeader } from '@/components/orders/orders-header';
import { OrdersTable } from '@/components/orders/orders-table';

export function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrdersApi({ page: 1, limit: 50 });
      setOrders(res?.items && res.items.length > 0 ? res.items : demoOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-sm font-medium">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-sm text-muted-foreground px-6">
        {error}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 w-full">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <OrdersHeader />
        <OrdersTable orders={orders} onReload={load} />
      </div>
    </div>
  );
}
