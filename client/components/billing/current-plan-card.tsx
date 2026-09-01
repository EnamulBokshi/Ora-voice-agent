'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { cancelSubscriptionApi } from '@/services/billing-service';
import { formatCurrency } from '@/lib/format';

interface CurrentPlanCardProps {
  subscription: SubscriptionDetailsResponse;
  onReload: () => void;
}

export function CurrentPlanCard({ subscription, onReload }: CurrentPlanCardProps) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will lose paid features at the end of the current billing cycle.')) return;
    setCancelling(true);
    try {
      await cancelSubscriptionApi();
      onReload();
    } catch {
      // silent
    } finally {
      setCancelling(false);
    }
  };

  const plan = subscription.plan;
  const sub = subscription.subscription;
  const usage = subscription.usage;

  return (
    <div className="pt-2">
      {/* Section Sub-Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h2 className="text-[13.5px] font-semibold text-foreground">
          Current Plan
        </h2>
        {sub && sub.status !== 'canceled' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-border bg-surface-high text-foreground hover:text-rose-400 hover:border-rose-400/40 hover:bg-rose-500/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {cancelling && <Loader2 className="animate-spin text-foreground" size={12} />}
            Cancel subscription
          </button>
        )}
      </div>

      {/* Main Details Row — flat 3-column split */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border py-4">
        {/* Col 1: Plan & Price */}
        <div className="py-2 md:py-0 md:pr-6 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">
              {plan ? plan.name : 'No active plan'}
            </span>
            {sub && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
                {sub.status.replace('_', ' ')}
              </span>
            )}
          </div>
          {plan && (
            <div className="text-[13px] font-mono text-muted-foreground">
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(plan.priceUsdCents / 100, 'USD')}
              </span>
              <span>/month · {sub?.billingProvider ?? 'Stripe'}</span>
            </div>
          )}
          <p className="text-[11.5px] text-muted-foreground pt-1">
            {sub
              ? `Current cycle: ${new Date(sub.currentPeriodStart).toLocaleDateString()} – ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
              : 'Subscribe to a plan to start selling with ORA.'}
          </p>
        </div>

        {/* Col 2: Usage this period */}
        <div className="py-3 md:py-0 md:px-6 space-y-2">
          <span className="text-[12px] font-medium text-muted-foreground block">
            Usage this billing period
          </span>
          <div className="space-y-1.5 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversation minutes:</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {usage.conversationMinutes.toLocaleString()} / {plan ? plan.limits.conversationMinutes.toLocaleString() : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Orders influenced:</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {usage.ordersPerMonth.toLocaleString()} / {plan ? plan.limits.ordersPerMonth.toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Col 3: Quotas & Entitlements */}
        <div className="py-3 md:py-0 md:pl-6 space-y-2">
          <span className="text-[12px] font-medium text-muted-foreground block">
            Plan Entitlements
          </span>
          <div className="space-y-1.5 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connected stores:</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {plan ? plan.limits.connectedStores : 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Merchant seats:</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {plan ? plan.limits.seats : 1}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
