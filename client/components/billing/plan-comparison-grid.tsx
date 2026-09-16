'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { getBillingPlansApi, subscribePlanApi } from '@/services/billing-service';
import { Plan } from '@/types/billing';
import { demoPlans } from '@/lib/demo-data';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PlanComparisonGridProps {
  currentPlanId: string | null;
  onSubscribed: () => void;
}

export function PlanComparisonGrid({ currentPlanId, onSubscribed }: PlanComparisonGridProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  useEffect(() => {
    getBillingPlansApi()
      .then((plans) => setPlans(plans && plans.length > 0 ? plans : demoPlans))
      .catch(() => setPlans(demoPlans))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    setSubscribingId(plan._id);
    try {
      const result = await subscribePlanApi({ planId: plan.planId, provider: 'stripe' });
      if (result.requiresRedirect && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result.requiresRedirect && result.bkashURL) {
        window.location.href = result.bkashURL;
        return;
      }
      onSubscribed();
    } catch {
      // silent
    } finally {
      setSubscribingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border/50 bg-surface-container/20 p-8 flex items-center justify-center text-muted-foreground text-xs">
        <Loader2 className="animate-spin mr-2" size={14} /> Loading available plans…
      </div>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/50 bg-surface-lowest p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-primary flex-shrink-0" />
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Available Subscription Tiers
          </h2>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          Stripe (USD) & bKash (BDT) supported
        </span>
      </div>

      {/* Responsive Cards Grid with Balanced Spacing & Padding */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {plans.map((plan) => {
          const isCurrent = plan.planId === currentPlanId;
          const isSubscribing = subscribingId === plan._id;

          return (
            <div
              key={plan._id}
              className={cn(
                'rounded-lg p-5 sm:p-6 flex flex-col justify-between transition-all border relative',
                isCurrent
                  ? 'bg-surface-container/80 border-primary/40 ring-1 ring-primary/20 shadow-sm'
                  : 'bg-surface-container/30 border-border/60 hover:border-border hover:bg-surface-container/50',
              )}
            >
              <div>
                {/* Plan Name & Current Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-base font-semibold text-foreground tracking-tight">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 font-semibold">
                      Current
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="mb-5 flex items-baseline">
                  <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                    {formatCurrency(plan.priceUsdCents / 100, 'USD')}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5 font-medium">/ mo</span>
                </div>

                {/* Limits & Feature Checklist */}
                <ul className="space-y-3 text-[12.5px] text-muted-foreground mb-6">
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                    <span>
                      <strong className="text-foreground font-semibold tabular-nums">
                        {plan.limits.conversationMinutes.toLocaleString()}
                      </strong>{' '}
                      voice minutes
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                    <span>
                      <strong className="text-foreground font-semibold tabular-nums">
                        {plan.limits.ordersPerMonth.toLocaleString()}
                      </strong>{' '}
                      checkout orders/mo
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                    <span>
                      <strong className="text-foreground font-semibold tabular-nums">
                        {plan.limits.connectedStores}
                      </strong>{' '}
                      connected store
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                    <span>Real-time Ora Live speech</span>
                  </li>
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full h-9 rounded-md text-xs font-semibold border border-border/60 text-muted-foreground bg-surface-high/40 cursor-default flex items-center justify-center select-none"
                  >
                    Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={Boolean(subscribingId)}
                    className="w-full h-9 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 touch-manipulation"
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="animate-spin text-primary-foreground" size={13} />
                        <span>Redirecting…</span>
                      </>
                    ) : (
                      <>
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
