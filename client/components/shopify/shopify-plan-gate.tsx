'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getBillingPlansApi,
  subscribeShopifyBillingApi,
} from '@/services/billing-service';
import { Plan } from '@/types/billing';
import { Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

/**
 * Plans come from `GET /billing/plans`, never from a list in this file.
 *
 * They used to be hardcoded here, and had drifted from the seeded plans in
 * every field that matters: a "Starter Agent" tier that does not exist in the
 * PlanId enum, so subscribing to it failed with PLAN_NOT_FOUND; prices of $99
 * and $249 against seeded values of $49 and $199; and "14-Day Free Trial
 * included" on all three when nothing was sending trialDays to Shopify at all.
 * A plan picker is a price list, and a price list that is not the server's is
 * wrong the moment either side moves.
 */

/** The free tier is a web-signup concept and is not sold through Shopify. */
const HIDDEN_PLAN_IDS = ['free'];

/** Which plan gets the visual emphasis, when it is present. */
const HIGHLIGHTED_PLAN_ID = 'growth';

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

function formatInterval(interval: string): string {
  return interval === 'year' || interval === 'yearly' ? '/year' : '/month';
}

export function ShopifyPlanGate() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoadError(null);
    try {
      const all = await getBillingPlansApi();
      setPlans(
        all.filter(
          (plan) => plan.isActive && !HIDDEN_PLAN_IDS.includes(plan.planId),
        ),
      );
    } catch (err: any) {
      setLoadError(err.message || 'Could not load plans.');
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const handleSubscribe = async (planId: string) => {
    setSubscribingId(planId);
    setError(null);

    try {
      const res = await subscribeShopifyBillingApi(planId);
      if (res?.confirmationUrl) {
        // App Bridge top-frame navigation: Shopify's billing approval page cannot be framed
        if (typeof window !== 'undefined') {
          window.open(res.confirmationUrl, '_top');
        }
      } else {
        throw new Error('No confirmation URL returned by Shopify.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Shopify subscription.');
      setSubscribingId(null);
    }
  };

  // The longest trial on offer, so the header promises only what a plan below
  // actually carries.
  const maxTrialDays = (plans || []).reduce(
    (longest, plan) => Math.max(longest, plan.trialDays || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 flex flex-col items-center">
      {/* Header Banner */}
      <div className="max-w-3xl text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Shopify App Store Launch Offer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-foreground">
          Activate Your ORA Voice AI Sales Agent
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          Turn store visitors into buyers with real-time voice guidance.
          {maxTrialDays > 0
            ? ` Start with a ${maxTrialDays}-day free trial.`
            : ''}{' '}
          Cancel anytime from your Shopify Admin.
        </p>
      </div>

      {error && (
        <div className="max-w-md w-full mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {loadError && (
        <div className="max-w-md w-full p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
          <p>{loadError}</p>
          <button
            onClick={() => void loadPlans()}
            className="mt-3 py-2 px-4 rounded-lg bg-surface-high hover:bg-surface-bright text-foreground border border-border text-xs font-semibold"
          >
            Try again
          </button>
        </div>
      )}

      {!plans && !loadError && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Loading plans…</span>
        </div>
      )}

      {plans && plans.length === 0 && (
        <div className="max-w-md w-full p-4 rounded-lg border border-border bg-surface-lowest text-sm text-center text-muted-foreground">
          No plans are available for purchase right now. Contact support and we
          will get your store activated.
        </div>
      )}

      {/* Plan Cards Grid */}
      {plans && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
          {plans.map((plan) => {
            const isPending = subscribingId === plan.planId;
            const highlighted = plan.planId === HIGHLIGHTED_PLAN_ID;
            const trialDays = plan.trialDays || 0;

            return (
              <div
                key={plan.planId}
                className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                  highlighted
                    ? 'border-primary/60 bg-surface-container shadow-2xl ring-1 ring-primary/40'
                    : 'border-border bg-surface-lowest hover:border-border/80'
                }`}
              >
                {highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-mono font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-foreground">
                      {plan.name}
                    </h3>
                    {trialDays > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {trialDays}-day free trial, then billed monthly through
                        Shopify.
                      </p>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono text-foreground">
                      {formatPrice(plan.priceUsdCents)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatInterval(plan.billingInterval)}
                    </span>
                  </div>

                  <div className="border-t border-border/50 pt-4 space-y-2.5">
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      What&apos;s included
                    </p>
                    <ul className="space-y-2">
                      {plan.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-foreground/90"
                        >
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border/40">
                  <button
                    disabled={Boolean(subscribingId)}
                    onClick={() => handleSubscribe(plan.planId)}
                    className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 ${
                      highlighted
                        ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-md'
                        : 'bg-surface-high hover:bg-surface-bright text-foreground border border-border'
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening Shopify Approval...</span>
                      </>
                    ) : (
                      <span>
                        {trialDays > 0
                          ? `Start ${trialDays}-Day Free Trial`
                          : `Choose ${plan.name}`}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security & Billing Assurance */}
      <div className="mt-12 flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span>Billed securely through your Shopify Account. 0% credit card fees.</span>
      </div>
    </div>
  );
}
