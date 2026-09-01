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
      <div className="rounded-md border border-border/50 bg-transparent p-8 flex items-center justify-center text-muted-foreground text-xs">
        <Loader2 className="animate-spin mr-2" size={14} /> Loading available plans…
      </div>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
            Available Subscription Tiers
          </h2>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          Stripe (USD) & bKash (BDT) supported
        </span>
      </div>

      {/* Flat Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40 border-b border-border/40">
        {plans.map((plan) => {
          const isCurrent = plan.planId === currentPlanId;
          const isSubscribing = subscribingId === plan._id;

          return (
            <div
              key={plan._id}
              className={cn(
                'p-6 flex flex-col justify-between transition-colors first:pl-0 last:pr-0',
                isCurrent ? 'bg-surface-high/20' : 'hover:bg-surface-high/10',
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[15px] font-semibold text-foreground font-serif">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[3px] bg-surface-high border border-border/60 text-foreground font-medium">
                      Current
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-2xl lg:text-[28px] font-semibold text-foreground font-serif tabular-nums leading-none tracking-tight">
                    {formatCurrency(plan.priceUsdCents / 100, 'USD')}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">/ mo</span>
                </div>

                <ul className="space-y-2.5 text-[12.5px] text-muted-foreground mb-6">
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-foreground dark:text-[#C8F031]" />
                    <span><strong className="text-foreground font-medium tabular-nums">{plan.limits.conversationMinutes.toLocaleString()}</strong> voice minutes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-foreground dark:text-[#C8F031]" />
                    <span><strong className="text-foreground font-medium tabular-nums">{plan.limits.ordersPerMonth.toLocaleString()}</strong> checkout orders/mo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-foreground dark:text-[#C8F031]" />
                    <span><strong className="text-foreground font-medium tabular-nums">{plan.limits.connectedStores}</strong> connected store</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-foreground dark:text-[#C8F031]" />
                    <span>Sub-85ms Ora Live speech latency</span>
                  </li>
                </ul>
              </div>

              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full h-8 rounded-md text-[12px] font-medium border border-border/60 text-muted-foreground bg-surface-high/30 cursor-default"
                  >
                    Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={Boolean(subscribingId)}
                    className="w-full h-8 rounded-md text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubscribing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight size={11} />
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
