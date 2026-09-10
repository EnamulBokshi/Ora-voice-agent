'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Receipt, RefreshCw } from 'lucide-react';
import { getOrdersApi, type Order } from '@/services/orders-service';
import { RecentOrdersTable } from '@/components/overview/recent-orders-table';

const PAGE_SIZE = 25;

/**
 * Order list behind the dashboard's revenue and order KPIs.
 *
 * The three headline KPI cards on the overview link here. Before this page existed,
 * `/orders` was a bare `redirect('/live-desk')`, so a merchant clicking their revenue
 * number to ask "which orders?" landed on a real-time monitoring console with no order
 * list in it — the click worked, the page changed, and the answer was never there.
 */
export function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrdersApi({ page: 1, limit: PAGE_SIZE });
      setOrders(res?.items ?? []);
      setTotal(res?.pagination?.total ?? res?.items?.length ?? 0);
    } catch (err) {
      // Surfaced, not swallowed: an empty table and a failed request must not look alike.
      setError(err instanceof Error ? err.message : 'Could not load orders');
      setOrders([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2.5">
            <Receipt size={18} className="text-muted-foreground" />
            Orders
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {total === null
              ? 'Orders placed by shoppers, including those ORA assisted.'
              : `${total} order${total === 1 ? '' : 's'} placed by shoppers, including those ORA assisted.`}
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border/60 bg-surface-high/40 hover:bg-surface-high text-[12px] font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : undefined} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="rounded-md border border-border/50 bg-transparent">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12.5px] text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading orders…</span>
          </div>
        ) : error ? (
          <div className="py-12 px-5 text-center space-y-3">
            <p className="text-[12.5px] text-foreground">{error}</p>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 h-8 px-3.5 rounded-md bg-foreground text-background font-semibold text-[12px] hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Try again
            </button>
          </div>
        ) : (
          <RecentOrdersTable
            orders={orders.map((o) => ({
              _id: o._id,
              orderNumber: o.orderNumber,
              status: o.status,
              totalAmount: o.totalAmount,
              currency: o.currency,
              createdAt: o.createdAt,
            }))}
          />
        )}
      </div>
    </div>
  );
}
