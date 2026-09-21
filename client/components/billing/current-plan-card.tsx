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
          <span className="w-2 h-2 rounded-[2px] bg-primary flex-shrink-0" />
          <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
            Active Plan & Billing Cycle
          </h2>
          {sub?.customLimits && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[3px] bg-primary/20 text-primary border border-primary/30 font-semibold">
              Scale Custom Limits Active
            </span>
          )}
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
              {plan ? plan.name : 'No Active Subscription'}
            </span>
            {sub && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-foreground uppercase">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    sub.status === 'active' || sub.status === 'trialing'
                      ? 'bg-[color:var(--status-online)]'
                      : 'bg-destructive',
                  )}
                />
                {sub.status === 'trialing' ? '14-Day Free Trial' : sub.status.replace('_', ' ')}
              </span>
            )}
          </div>
          {plan && (
            <div className="text-[13px] text-muted-foreground">
              <span className="text-2xl lg:text-[28px] font-semibold text-foreground font-serif tabular-nums leading-none tracking-tight">
                {sub?.billingProvider === 'bkash'
                  ? `৳${Math.round(plan.priceBdtPaisa / 100).toLocaleString()}`
                  : formatCurrency(plan.priceUsdCents / 100, 'USD')}
              </span>
              <span> / month · {providerName}</span>
            </div>
          )}
          <p className="text-[11.5px] text-muted-foreground pt-1">
            {sub?.status === 'trialing' && sub?.currentPeriodEnd
              ? `Trial ends: ${formatDateTime(sub.currentPeriodEnd)}`
              : sub?.currentPeriodStart && sub?.currentPeriodEnd
              ? `Cycle: ${formatDateTime(sub.currentPeriodStart)} – ${formatDateTime(sub.currentPeriodEnd)}`
              : 'Choose a plan below to activate your 14-day risk-free trial.'}
          </p>
        </div>

        {/* Col 2: Usage this period */}
        <div className="py-3 md:py-0 md:px-6 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
            Usage This Period
          </span>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Voice conversation:</span>
              <span className="font-medium text-foreground tabular-nums">
                {(usage.voiceMinutes ?? usage.conversationMinutes ?? 0).toLocaleString()} /{' '}
                {(
                  sub?.customLimits?.voiceMinutes ??
                  plan?.limits?.voiceMinutes ??
                  plan?.limits?.conversationMinutes ??
                  150
                ).toLocaleString()}{' '}
                mins
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Knowledge base documents:</span>
              <span className="font-medium text-foreground tabular-nums">
                {(usage.documentCount ?? 0).toLocaleString()} /{' '}
                {(
                  sub?.customLimits?.documentLimit ??
                  plan?.limits?.documentLimit ??
                  5
                ).toLocaleString()}{' '}
                docs
              </span>
            </div>
          </div>
        </div>

        {/* Col 3: Quotas & Capacity */}
        <div className="py-3 md:py-0 md:pl-6 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
            Connected Domains & Capacity
          </span>
          <div className="space-y-2 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verified websites / domains:</span>
              <span className="font-medium text-foreground tabular-nums">
                {(usage.websiteCount ?? usage.connectedStores ?? 1).toLocaleString()} /{' '}
                {(
                  sub?.customLimits?.websiteLimit ??
                  plan?.limits?.websiteLimit ??
                  plan?.limits?.connectedStores ??
                  1
                ).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Voice AI engine:</span>
              <span className="font-medium text-primary tabular-nums">
                Real-Time Streaming Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
