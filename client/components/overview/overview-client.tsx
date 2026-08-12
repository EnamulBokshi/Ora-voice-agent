'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Package, ShoppingCart, MessageSquareText, CreditCard } from 'lucide-react';
import { getProductsApi } from '@/services/products-service';
import { getOrdersApi, Order } from '@/services/orders-service';
import { getConversationsApi, Conversation } from '@/services/conversations-service';
import { getSubscriptionApi } from '@/services/billing-service';
import { Plan } from '@/types/billing';
import { demoOrders, demoConversations } from '@/lib/demo-data';
import { formatCurrency } from '@/lib/format';

interface OverviewStats {
  productTotal: number;
  orderTotal: number;
  conversationTotal: number;
  planName: string | null;
  planStatus: string | null;
  recentOrders: Order[];
  recentConversations: Conversation[];
}

export function OverviewClient() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, orders, conversations, subscription] = await Promise.all([
        getProductsApi({ page: 1, limit: 1 }),
        getOrdersApi({ page: 1, limit: 5 }),
        getConversationsApi({ page: 1, limit: 5 }),
        getSubscriptionApi().catch(() => null),
      ]);

      setStats({
        productTotal: products?.pagination?.total ?? 0,
        orderTotal: orders?.pagination?.total ?? 0,
        conversationTotal: conversations?.pagination?.total ?? 0,
        planName: subscription?.plan?.name ?? null,
        planStatus: subscription?.subscription?.status ?? null,
        recentOrders: orders?.items && orders.items.length > 0 ? orders.items : demoOrders,
        recentConversations:
          conversations?.items && conversations.items.length > 0 ? conversations.items : demoConversations,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load overview');
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
          <span className="text-sm font-medium">Loading overview...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-sm text-muted-foreground px-6">
        {error ?? 'Overview unavailable.'}
      </div>
    );
  }

  const statCards = [
    { label: 'Products', value: stats.productTotal.toLocaleString(), icon: <Package size={16} /> },
    { label: 'Orders', value: stats.orderTotal.toLocaleString(), icon: <ShoppingCart size={16} /> },
    { label: 'Conversations', value: stats.conversationTotal.toLocaleString(), icon: <MessageSquareText size={16} /> },
    {
      label: 'Plan',
      value: stats.planName ?? 'Free',
      icon: <CreditCard size={16} />,
      hint: stats.planStatus ? stats.planStatus.replace('_', ' ') : undefined,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 w-full">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Overview</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            A snapshot of your store and ORA activity.
          </p>
        </div>

        {/* Stat cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key metrics">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-md border border-border bg-surface-container p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                {card.icon}
                <span className="text-[12px] font-medium">{card.label}</span>
              </div>
              <p className="text-2xl font-semibold text-foreground tabular-nums">{card.value}</p>
              {card.hint && (
                <p className="text-[11px] text-muted-foreground mt-1 capitalize">{card.hint}</p>
              )}
            </div>
          ))}
        </section>

        {/* Recent orders */}
        <section aria-label="Recent orders">
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No orders yet. Orders created by ORA from widget conversations will appear here.
            </p>
          ) : (
            <div className="rounded-md border border-border bg-surface-container overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Order</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Total</th>
                    <th className="px-4 py-2.5 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order._id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium text-foreground">{order.orderNumber}</td>
                      <td className="px-4 py-2.5 capitalize text-muted-foreground">{order.status}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent conversations */}
        <section aria-label="Recent conversations">
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent conversations</h2>
          {stats.recentConversations.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No conversations yet. Sessions from the ORA widget will appear here.
            </p>
          ) : (
            <div className="rounded-md border border-border bg-surface-container overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Session</th>
                    <th className="px-4 py-2.5 font-medium">Channel</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentConversations.map((conv) => (
                    <tr key={conv._id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-foreground">
                        {conv.sessionId.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-2.5 capitalize text-muted-foreground">
                        {conv.channel.replace('widget_', '')}
                      </td>
                      <td className="px-4 py-2.5 capitalize text-muted-foreground">{conv.status}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {new Date(conv.lastActivityAt || conv.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
