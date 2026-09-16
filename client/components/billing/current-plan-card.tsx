'use client';

import { useState } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { cancelSubscriptionApi } from '@/services/billing-service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CurrentPlanCardProps {
  subscription: SubscriptionDetailsResponse;
  onReload: () => void;
}

export function CurrentPlanCard({ subscription, onReload }: CurrentPlanCardProps) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<
    { ok: true } | { ok: false; message: string } | null
  >(null);

  const handleCancel = async () => {
    // Names the consequence for a voice product: the agent stops answering shoppers.
    if (
      !confirm(
        'Cancel your subscription?\n\nORA will keep serving your storefront until the end of the current billing cycle, then stop answering shoppers. Your catalog and conversation history are kept.',
      )
    ) {
      return;
    }
    setCancelling(true);
    setCancelResult(null);
    try {
      await cancelSubscriptionApi();
      setCancelResult({ ok: true });
      onReload();
    } catch (err) {
      // Previously `catch { // silent }`: the spinner stopped and the merchant had no
      // idea whether their storefront agent was still paid for.
      setCancelResult({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'We could not cancel your subscription. It is still active — please retry.',
      });
    } finally {
      setCancelling(false);
    }
  };

  const plan = subscription.plan;
  const sub = subscription.subscription;
  const usage = subscription.usage;

  const providerName =
    sub?.billingProvider === 'bkash'
      ? 'bKash'
      : sub?.billingProvider
      ? sub.billingProvider.charAt(0).toUpperCase() + sub.billingProvider.slice(1)
      : 'Stripe';

  return (
    <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-6">
      {/* Section Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
            Active Plan & Billing Cycle
          </h2>
        </div>
        {sub && sub.status !== 'canceled' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="self-start sm:self-auto px-3 py-1.5 rounded-md text-[12px] font-medium border border-border/60 bg-surface-high/40 text-muted-foreground hover:text-rose-400 hover:border-rose-400/40 hover:bg-rose-500/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer font-sans touch-manipulation"
          >
            {cancelling && <Loader2 className="animate-spin text-foreground" size={12} />}
            Cancel subscription
          </button>
        )}
      </div>

      {/* The outcome of the highest-stakes action on this surface, stated plainly. */}
      {cancelResult && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 rounded-md border px-3 py-2.5 text-[12.5px]',
            cancelResult.ok
              ? 'border-border/60 bg-surface-high/40 text-foreground'
              : 'border-destructive/40 bg-destructive/5 text-foreground',
          )}
        >
          {cancelResult.ok ? (
            <>
              <Check size={13} className="mt-0.5 shrink-0 text-foreground" />
              <span>
                Subscription cancelled. ORA keeps answering shoppers until the end of this
                billing cycle.
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-foreground" />
              <span>{cancelResult.message}</span>
            </>
          )}
        </div>
      )}

      {/* Main Details Row — flat 3-column split with hairline borders */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40 pt-1">
        {/* Col 1: Plan & Price */}
        <div className="py-2 md:py-0 md:pr-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-semibold text-foreground font-serif">
              {plan ? plan.name : 'Free Tier'}
            </span>
            {sub && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-foreground uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
                {sub.status.replace('_', ' ')}
              </span>
            )}
          </div>
          {plan && (
            <div className="text-[13px] text-muted-foreground">
              <span className="text-2xl lg:text-[28px] font-semibold text-foreground font-serif tabular-nums leading-none tracking-tight">
                {formatCurrency(plan.priceUsdCents / 100, 'USD')}
              </span>
              <span> / month · {providerName}</span>
            </div>
          )}
          <p className="text-[11.5px] text-muted-foreground pt-1">
            {sub?.currentPeriodStart && sub?.currentPeriodEnd
              ? `Cycle: ${formatDateTime(sub.currentPeriodStart)} – ${formatDateTime(sub.currentPeriodEnd)}`
              : 'Active free store quota tier.'}
          </p>
        </div>

        {/* Col 2: Usage this period */}
        <div className="py-3 md:py-0 md:px-6 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
            Usage This Period
          </span>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Voice conversation minutes:</span>
              <span className="font-medium text-foreground tabular-nums">
                {usage.conversationMinutes.toLocaleString()} / {plan ? plan.limits.conversationMinutes.toLocaleString() : '100'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assisted checkout orders:</span>
              <span className="font-medium text-foreground tabular-nums">
                {usage.ordersPerMonth.toLocaleString()} / {plan ? plan.limits.ordersPerMonth.toLocaleString() : '25'}
              </span>
            </div>
          </div>
        </div>

        {/* Col 3: Quotas & Capacity */}
        <div className="py-3 md:py-0 md:pl-6 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
            Provisioned Capacity
          </span>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connected storefronts:</span>
              <span className="font-medium text-foreground tabular-nums">
                {usage.connectedStores ?? 1} / {plan ? plan.limits.connectedStores : 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Voice Engine:</span>
              <span className="font-medium text-foreground">
                Active & Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
