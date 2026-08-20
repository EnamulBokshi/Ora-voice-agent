'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
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
      <div className="py-8 flex items-center justify-center text-muted-foreground text-xs">
        <Loader2 className="animate-spin mr-2" size={14} /> Loading available plans…
      </div>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="pt-4">
      {/* Header */}
      <div className="pb-3 border-b border-border">
        <h2 className="text-[13.5px] font-semibold text-foreground">Available Plans</h2>
      </div>

      {/* Flat Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border">
        {plans.map((plan) => {
          const isCurrent = plan.planId === currentPlanId;
          const isSubscribing = subscribingId === plan._id;

          return (
            <div
              key={plan._id}
              className={cn(
                'p-6 flex flex-col justify-between transition-colors',
                isCurrent ? 'bg-surface-high/30' : 'hover:bg-surface-high/15',
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[14px] font-semibold text-foreground">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Current Plan
                    </span>
                  )}
                </div>

                <div className="text-xl font-bold tabular-nums text-foreground mb-4 font-mono">
                  {formatCurrency(plan.priceUsdCents / 100, 'USD')}
                  <span className="text-xs font-normal text-muted-foreground font-sans">/month</span>
                </div>

                <ul className="space-y-2 text-[12px] text-muted-foreground mb-6">
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-foreground" />
                    <span>{plan.limits.conversationMinutes.toLocaleString()} conversation minutes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-foreground" />
                    <span>{plan.limits.ordersPerMonth.toLocaleString()} orders per month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-foreground" />
                    <span>{plan.limits.connectedStores} connected store{plan.limits.connectedStores === 1 ? '' : 's'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-foreground" />
                    <span>{plan.limits.seats} team seat{plan.limits.seats === 1 ? '' : 's'}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isCurrent || isSubscribing}
                className={cn(
                  'w-full py-2 rounded text-xs font-medium transition-colors disabled:opacity-50',
                  isCurrent
                    ? 'bg-surface-high text-muted-foreground cursor-default'
                    : 'bg-foreground text-background hover:opacity-90 font-semibold',
                )}
              >
                {isSubscribing ? 'Processing…' : isCurrent ? 'Active' : 'Upgrade Plan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
