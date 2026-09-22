'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, ArrowRight, Sparkles, CreditCard } from 'lucide-react';
import { getBillingPlansApi } from '@/services/billing-service';
import { Plan } from '@/types/billing';
import { demoPlans } from '@/lib/demo-data';
import { cn } from '@/lib/utils';
import { StartTrialModal } from './start-trial-modal';

interface PlanComparisonGridProps {
  currentPlanId: string | null;
  onSubscribed: () => void;
  hasUsedTrial?: boolean;
  isTrialing?: boolean;
  trialDaysRemaining?: number | null;
}

export function PlanComparisonGrid({
  currentPlanId,
  onSubscribed,
  hasUsedTrial = false,
  isTrialing = false,
  trialDaysRemaining = null,
}: PlanComparisonGridProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'BDT'>('USD');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [trialModalPlan, setTrialModalPlan] = useState<Plan | null>(null);

  useEffect(() => {
    getBillingPlansApi()
      .then((plans) => {
        const filtered = (plans || []).filter((p) => p.planId !== 'free' && p.isActive !== false);
        setPlans(filtered.length > 0 ? filtered : demoPlans);
      })
      .catch(() => setPlans(demoPlans))
      .finally(() => setLoading(false));
  }, []);

  const hasConsumedTrial = Boolean(hasUsedTrial || currentPlanId);

  // Buying a plan always goes through the checkout step, where the merchant picks a
  // gateway and pays. Calling /billing/subscribe straight from this grid used to
  // activate the plan in one click whenever no gateway was configured.
  const goToCheckout = (plan: Plan) => {
    setSubscribingId(plan._id);
    router.push(`/billing/checkout?planId=${encodeURIComponent(plan.planId)}`);
  };

  const handleCardCta = (plan: Plan) => {
    // If brand new user with no previous trial -> open StartTrialModal
    if (!hasConsumedTrial) {
      setTrialModalPlan(plan);
      return;
    }
    // Otherwise -> Paid Subscription / Upgrade checkout
    goToCheckout(plan);
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
    <div id="available-tiers" className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-6 scroll-mt-6">
      {/* Header with Currency Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[2px] bg-primary flex-shrink-0" />
          <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
            Available Subscription Tiers
          </h2>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono text-muted-foreground mr-1">Currency:</span>
          <div className="inline-flex rounded-md border border-border/60 bg-surface-low p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={cn(
                'px-2.5 py-1 rounded-[3px] font-medium transition-colors',
                currency === 'USD'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              USD ($) · Stripe
            </button>
            <button
              type="button"
              onClick={() => setCurrency('BDT')}
              className={cn(
                'px-2.5 py-1 rounded-[3px] font-medium transition-colors',
                currency === 'BDT'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              BDT (৳) · bKash
            </button>
          </div>
        </div>
      </div>

      {/* 3-Tier Pricing Grid (Starter, Growth, Scale) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = plan.planId === currentPlanId;
          const isSubscribing = subscribingId === plan._id;
          const isScale = plan.planId === 'scale';
          const voiceMins = plan.limits?.voiceMinutes ?? plan.limits?.conversationMinutes ?? 0;
          const docLimit = plan.limits?.documentLimit ?? 5;
          const siteLimit = plan.limits?.websiteLimit ?? plan.limits?.connectedStores ?? 1;

          const displayPrice =
            currency === 'USD'
              ? `$${Math.round(plan.priceUsdCents / 100)}`
              : `৳${Math.round(plan.priceBdtPaisa / 100).toLocaleString()}`;

          return (
            <div
              key={plan._id}
              className={cn(
                'p-5 rounded-lg border flex flex-col justify-between transition-all relative',
                isCurrent
                  ? 'border-primary bg-surface-high/30 ring-1 ring-primary/20'
                  : 'border-border/50 hover:border-border/80 bg-surface-lowest/40',
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-1.5 flex-wrap">
                  <h3 className="text-[15px] font-semibold text-foreground font-serif">{plan.name}</h3>

                  {isCurrent && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[3px] bg-primary text-primary-foreground font-semibold">
                      {isTrialing
                        ? `Trial (${trialDaysRemaining !== null ? `${trialDaysRemaining}d left` : 'Active'})`
                        : 'Current'}
                    </span>
                  )}

                  {!isCurrent && !hasConsumedTrial && plan.trialDays && plan.trialDays > 0 && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-accent text-foreground border border-border/50">
                      14d Free Trial
                    </span>
                  )}

                  {!isCurrent && hasConsumedTrial && (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] bg-surface-high/60 text-muted-foreground border border-border/40">
                      Direct Billing
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-2xl lg:text-[28px] font-semibold text-foreground font-serif tabular-nums leading-none tracking-tight">
                    {displayPrice}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">/ mo</span>
                </div>

                <ul className="space-y-2.5 text-[12px] text-muted-foreground mb-6">
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-primary" />
                    <span>
                      <strong className="text-foreground font-medium tabular-nums">
                        {voiceMins.toLocaleString()}
                      </strong>{' '}
                      voice minutes / mo
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-primary" />
                    <span>
                      <strong className="text-foreground font-medium tabular-nums">
                        {docLimit.toLocaleString()}
                      </strong>{' '}
                      knowledge docs limit
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-primary" />
                    <span>
                      <strong className="text-foreground font-medium tabular-nums">
                        {siteLimit}
                      </strong>{' '}
                      verified website{siteLimit > 1 ? 's' : ''}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={13} className="shrink-0 mt-0.5 text-primary" />
                    <span>Real-time voice AI agent</span>
                  </li>
                  {isScale && (
                    <li className="flex items-start gap-2 text-primary font-medium">
                      <Sparkles size={13} className="shrink-0 mt-0.5" />
                      <span>Custom limits & SLA available</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="pt-2">
                {isCurrent && !isTrialing ? (
                  <button
                    disabled
                    className="w-full h-9 rounded-md text-[12px] font-medium border border-border/60 text-muted-foreground bg-surface-high/30 cursor-default touch-manipulation"
                  >
                    Active Plan
                  </button>
                ) : isCurrent && isTrialing ? (
                  <button
                    onClick={() => goToCheckout(plan)}
                    disabled={Boolean(subscribingId)}
                    className="w-full h-9 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 touch-manipulation"
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="animate-spin text-primary-foreground" size={13} />
                        <span>Opening checkout…</span>
                      </>
                    ) : (
                      <>
                        <CreditCard size={13} />
                        <span>Pay & Activate {plan.name}</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCardCta(plan)}
                    disabled={Boolean(subscribingId)}
                    className="w-full h-9 rounded-md text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 touch-manipulation"
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="animate-spin text-background" size={13} />
                        <span>Opening checkout…</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {hasConsumedTrial
                            ? `Upgrade to ${plan.name}`
                            : `Start 14-Day Free Trial`}
                        </span>
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

      {/* Start Trial Modal for first-time merchants */}
      <StartTrialModal
        isOpen={Boolean(trialModalPlan)}
        plan={trialModalPlan}
        onClose={() => setTrialModalPlan(null)}
        onSuccess={() => {
          setTrialModalPlan(null);
          onSubscribed();
        }}
      />
    </div>
  );
}
