'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { getBillingPlansApi, subscribePlanApi } from '@/services/billing-service';
import { Plan } from '@/types/billing';
import { demoPlans } from '@/lib/demo-data';
import { formatCurrency } from '@/lib/format';
import { useEffect } from 'react';

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
      <div className="rounded-md border border-border bg-surface-container p-8 flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={14} /> Loading plans...
      </div>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Available plans</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.planId === currentPlanId;
          const isSubscribing = subscribingId === plan._id;

          return (
            <div
              key={plan._id}
              className={`rounded-md border bg-surface-container p-5 flex flex-col ${
                isCurrent ? 'border-primary' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                {isCurrent && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    Current
                  </span>
                )}
              </div>
              <div className="text-xl font-semibold tabular-nums text-foreground mb-4">
                {formatCurrency(plan.priceUsdCents / 100, 'USD')}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </div>

              <ul className="space-y-2 text-[12px] text-muted-foreground mb-5 flex-1">
                <li className="flex items-start gap-2">
                  <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                  {plan.limits.conversationMinutes.toLocaleString()} conversation minutes
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                  {plan.limits.ordersPerMonth.toLocaleString()} orders per month
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                  {plan.limits.connectedStores} connected store{plan.limits.connectedStores === 1 ? '' : 's'}
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="shrink-0 mt-0.5 text-primary" />
                  {plan.limits.seats} seat{plan.limits.seats === 1 ? '' : 's'}
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isCurrent || isSubscribing}
                className={`w-full py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                  isCurrent
                    ? 'bg-surface-high text-muted-foreground cursor-default'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                }`}
              >
                {isSubscribing ? 'Subscribing...' : isCurrent ? 'Current plan' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
