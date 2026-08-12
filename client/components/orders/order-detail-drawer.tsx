'use client';

import { useState } from 'react';
import { X, MapPin, ShoppingBag } from 'lucide-react';
import { Order } from '@/services/orders-service';
import { updateOrderStatusApi } from '@/services/orders-service';
import { OrderStatusBadge } from './subcomponents/orders-status-badges';
import { formatCurrency } from '@/lib/format';

interface OrderDetailDrawerProps {
  order: Order;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export function OrderDetailDrawer({ order, onClose, onStatusUpdated }: OrderDetailDrawerProps) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (status: Order['status']) => {
    if (updating || status === order.status) return;
    setUpdating(true);
    try {
      await updateOrderStatusApi(order._id, status);
      onStatusUpdated();
    } catch {
      // silent
    } finally {
      setUpdating(false);
    }
  };

  const nextStatuses: Order['status'][] = ['pending', 'confirmed', 'shipped', 'delivered', 'canceled'];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="w-full max-w-md h-full flex flex-col border-l border-border bg-surface-container overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-border flex justify-between items-center sticky top-0 bg-surface-container z-10">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-semibold font-mono text-foreground">{order.orderNumber}</h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 flex-1 text-[13px]">
          {/* Items */}
          <div className="space-y-3">
            <h3 className="font-medium text-muted-foreground uppercase tracking-wider text-[11px] flex items-center gap-1">
              <ShoppingBag size={13} /> Order items
            </h3>

            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-md border border-border bg-surface-low flex justify-between items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-muted-foreground text-[12px]">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCurrency(item.unitPrice * item.quantity, order.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-md border border-border bg-surface-high flex justify-between items-center font-medium text-foreground">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCurrency(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>

          {/* Shipping */}
          {order.shippingAddress && (
            <div className="p-3.5 rounded-md border border-border bg-surface-low space-y-1">
              <span className="text-[11px] font-medium uppercase text-muted-foreground flex items-center gap-1">
                <MapPin size={12} /> Shipping address
              </span>
              <p className="text-foreground font-medium">
                {[order.shippingAddress.fullName, order.shippingAddress.addressLine1, order.shippingAddress.city, order.shippingAddress.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}

          {/* Status update */}
          <div className="p-3.5 rounded-md border border-border bg-surface-low">
            <span className="text-[11px] font-medium uppercase text-muted-foreground block mb-2">
              Update status
            </span>
            <div className="flex flex-wrap gap-1.5">
              {nextStatuses.map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  disabled={updating || st === order.status}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize border transition-colors disabled:opacity-50 ${
                    st === order.status
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-surface-high'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
