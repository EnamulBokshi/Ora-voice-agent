'use client';

import { X, Sparkles, MapPin, CreditCard, ShoppingBag, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { OrderRecord } from '@/components/orders/orders-types';

interface OrderDetailDrawerProps {
  order: OrderRecord;
  onClose: () => void;
}

export function OrderDetailDrawer({ order, onClose }: OrderDetailDrawerProps) {
  const o = order;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all">
      <div
        className="w-full max-w-md h-full flex flex-col shadow-2xl border-l overflow-y-auto animate-in slide-in-from-right duration-200"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Drawer Header */}
        <div
          className="p-6 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-md"
          style={{
            background: 'var(--surface-high)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-lg font-bold font-mono text-foreground">{o.id}</h2>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                style={{
                  background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                  color: 'var(--ora-success)',
                }}
              >
                {o.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{o.timestamp} via {o.channel}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-[var(--surface-container)] transition-colors border"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* Customer Info Card */}
          <div
            className="rounded-2xl p-4 border space-y-1.5"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Customer</span>
            <p className="text-sm font-bold text-foreground">{o.customerName}</p>
            <p className="text-muted-foreground">{o.customerEmail}</p>
          </div>

          {/* ORA AI Sales Attribution */}
          <div
            className="rounded-2xl p-4 border space-y-3 relative overflow-hidden"
            style={{
              background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-container))',
              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                ORA AI Sales Attribution
              </div>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                {o.oraAttribution.confidenceScore}% match
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">{o.oraAttribution.ruleApplied}</p>
              <p className="italic text-muted-foreground leading-relaxed">
                {o.oraAttribution.transcriptSnippet}
              </p>
            </div>
          </div>

          {/* Items Purchased List */}
          <div className="space-y-3">
            <h3 className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1">
              <ShoppingBag size={13} /> Order Items
            </h3>

            <div className="space-y-2">
              {o.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border flex justify-between items-center"
                  style={{
                    background: 'var(--glass-bg)',
                    borderColor: 'var(--glass-border)',
                  }}
                >
                  <div>
                    <p className="font-bold text-foreground">{item.name}</p>
                    <p className="text-muted-foreground text-[11px]">Qty: {item.qty}</p>
                  </div>
                  <span className="font-mono font-bold text-foreground">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div
              className="p-3.5 rounded-xl border flex justify-between items-center font-bold text-sm"
              style={{
                background: 'var(--surface-high)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <span>Total Amount</span>
              <span className="font-mono text-base text-[var(--primary)]">${o.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping & Payment info */}
          <div className="grid grid-cols-1 gap-3">
            <div
              className="p-3.5 rounded-xl border space-y-1"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <MapPin size={12} /> Shipping Address
              </span>
              <p className="text-foreground font-medium">{o.shippingAddress}</p>
            </div>

            <div
              className="p-3.5 rounded-xl border space-y-1"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <CreditCard size={12} /> Payment Method
              </span>
              <p className="text-foreground font-medium">{o.paymentMethod}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
