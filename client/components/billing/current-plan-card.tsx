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
    if (!confirm('Cancel your subscription? You will lose paid features at the end of the period.')) return;
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Active plan */}
      <div className="lg:col-span-8 rounded-md border border-border bg-surface-container p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-lg font-semibold text-foreground">
                {plan ? plan.name : 'No plan'}
              </h2>
              {sub && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: 'var(--success)', color: 'var(--success-foreground)' }}
                >
                  {sub.status.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {sub
                ? `Billing period ${new Date(sub.currentPeriodStart).toLocaleDateString()} - ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                : 'No active subscription.'}
            </p>
          </div>

          {plan && (
            <div className="text-left sm:text-right">
              <div className="text-2xl font-semibold tabular-nums text-foreground leading-none">
                {formatCurrency(plan.priceUsdCents / 100, 'USD')}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 capitalize">
                {sub?.billingProvider ?? 'no provider'}
              </p>
            </div>
          )}
        </div>

        {/* Usage */}
        <div className="grid grid-cols-2 gap-4 text-[13px]">
          <div className="p-3 rounded-md border border-border bg-surface-low">
            <p className="text-[11px] font-medium uppercase text-muted-foreground mb-1">
              Conversation minutes
            </p>
            <p className="font-semibold text-foreground tabular-nums">
              {usage.conversationMinutes.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-md border border-border bg-surface-low">
            <p className="text-[11px] font-medium uppercase text-muted-foreground mb-1">Orders</p>
            <p className="font-semibold text-foreground tabular-nums">
              {usage.ordersPerMonth.toLocaleString()}
            </p>
          </div>
        </div>

        {sub && sub.status !== 'canceled' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="mt-5 px-3.5 py-1.5 rounded-md text-xs font-medium border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {cancelling && <Loader2 className="animate-spin" size={12} />}
            Cancel subscription
          </button>
        )}
      </div>

      {/* Plan limits summary */}
      <div className="lg:col-span-4 rounded-md border border-border bg-surface-container p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Plan limits</h3>
        {plan ? (
          <dl className="space-y-3 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Conversation minutes</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {plan.limits.conversationMinutes.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Orders per month</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {plan.limits.ordersPerMonth.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Connected stores</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {plan.limits.connectedStores}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Seats</dt>
              <dd className="font-medium text-foreground tabular-nums">{plan.limits.seats}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Subscribe to a plan to unlock limits.
          </p>
        )}
      </div>
    </div>
  );
}
