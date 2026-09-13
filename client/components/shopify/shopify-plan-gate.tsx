'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getBillingPlansApi,
  subscribeShopifyBillingApi,
} from '@/services/billing-service';
import { Plan } from '@/types/billing';
import { Check, Loader2, BadgeCheck, ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { useShopifySession } from '@/components/shopify/shopify-session-provider';

/**
 * Roles POST /shopify/billing/subscribe accepts. Anyone else is shown who to
 * ask instead of a button that answers 403.
 */
const BILLING_ROLES = ['owner', 'admin'];

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
  const { session } = useShopifySession();
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
      let msg = err.message || 'Failed to initiate Shopify subscription.';
      if (typeof msg === 'string' && msg.toLowerCase().includes('public distribution')) {
        msg =
          'Shopify requires Public Distribution to enable the Billing API. In your Shopify Partner Dashboard: go to Apps > ORA-VOICE-AI > Distribution > select "Public distribution" > Save. (You do not need to publish to the App Store to test trials).';
      } else if (
        typeof msg === 'string' &&
        (msg.includes('<!DOCTYPE') ||
          msg.includes('<html') ||
          msg.includes('502: Bad gateway') ||
          msg.includes('Bad gateway'))
      ) {
        msg =
          'Connection to the development server timed out or failed (502 Bad Gateway). Please restart your "pnpm shopify:dev" terminal so the Cloudflare tunnel reconnects.';
      }
      setError(msg);
      setSubscribingId(null);
    }
  };

  const maxTrialDays = (plans || []).reduce(
    (longest, plan) => Math.max(longest, plan.trialDays || 0),
    0,
  );

  const canSubscribe = BILLING_ROLES.includes(session?.user?.role || '');

  if (!canSubscribe) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 flex flex-col items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-border/80 bg-surface-container p-8 text-center flex flex-col items-center gap-4 shadow-xl">
          <div className="size-11 rounded-full bg-surface-high border border-border/70 text-foreground flex items-center justify-center">
            <Lock className="size-4 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-serif font-semibold text-foreground tracking-tight">
            Account Approval Required
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Only the primary Shopify store owner can approve recurring application charges.
            Please ask your store administrator to launch ORA from Shopify Admin to activate your plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-8 py-10 flex flex-col items-center">
      {/* Header Banner */}
      <div className="max-w-3xl text-center flex flex-col items-center gap-3.5 mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-high border border-border/70 text-foreground text-xs font-mono font-medium tracking-tight">
          <BadgeCheck className="size-3.5 text-primary" />
          <span>Shopify App Store Release</span>
          <span className="size-1 rounded-full bg-primary" />
          <span className="text-muted-foreground">Official Edition</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground">
          Activate Your ORA Voice AI Sales Agent
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed">
          Automate customer sales, answer product inquiries, and recover abandoned carts 24/7.
          {maxTrialDays > 0 ? ` Includes a ${maxTrialDays}-day risk-free trial.` : ''}{' '}
          Manage or cancel anytime directly in Shopify Admin.
        </p>
      </div>

      {error && (
        <div className="max-w-xl w-full mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center font-medium leading-relaxed">
          {error}
        </div>
      )}

      {loadError && (
        <div className="max-w-md w-full p-6 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center flex flex-col items-center gap-3">
          <p>{loadError}</p>
          <button
            onClick={() => void loadPlans()}
            className="py-2 px-4 rounded-lg bg-surface-high hover:bg-surface-bright text-foreground border border-border text-xs font-semibold cursor-pointer transition-colors"
          >
            Retry Loading
          </button>
        </div>
      )}

      {!plans && !loadError && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground py-16">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span className="font-mono text-xs">Fetching current subscription tiers…</span>
        </div>
      )}

      {plans && plans.length === 0 && (
        <div className="max-w-md w-full p-6 rounded-xl border border-border bg-surface-lowest text-sm text-center text-muted-foreground">
          No subscription tiers are currently available. Please contact ORA support to activate your store.
        </div>
      )}

      {/* Plan Cards Grid */}
      {plans && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full items-stretch">
          {plans.map((plan) => {
            const isPending = subscribingId === plan.planId;
            const highlighted = plan.planId === HIGHLIGHTED_PLAN_ID;
            const trialDays = plan.trialDays || 0;

            return (
              <div
                key={plan.planId}
                className={`relative rounded-2xl border p-7 flex flex-col justify-between transition-all duration-200 ${
                  highlighted
                    ? 'border-primary/80 bg-surface-container ring-1 ring-primary/30 shadow-[0_0_30px_rgba(200,240,49,0.06)]'
                    : 'border-border/70 bg-surface-lowest hover:border-border/90 hover:bg-surface-container/40'
                }`}
              >
                {highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-mono font-semibold tracking-wider uppercase shadow-md">
                    Recommended
                  </div>
                )}

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xl font-serif font-bold text-foreground tracking-tight">
                      {plan.name}
                    </h3>
                    {trialDays > 0 ? (
                      <span className="inline-flex items-center text-[12px] font-mono text-primary font-medium">
                        {trialDays}-day free trial included
                      </span>
                    ) : (
                      <span className="text-[12px] font-mono text-muted-foreground">
                        Billed through Shopify Billing
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 py-1">
                    <span className="text-4xl font-bold font-mono text-foreground tracking-tight">
                      {formatPrice(plan.priceUsdCents)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatInterval(plan.billingInterval)}
                    </span>
                  </div>

                  <div className="border-t border-border/50 pt-5 flex flex-col gap-3">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/80 font-medium">
                      Capabilities & Features
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {plan.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-foreground/90 leading-relaxed"
                        >
                          <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
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
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      highlighted
                        ? 'bg-primary text-primary-foreground hover:opacity-95 shadow-md active:scale-[0.99]'
                        : 'bg-surface-high hover:bg-surface-bright text-foreground border border-border/80 active:scale-[0.99]'
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Connecting to Shopify…</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {trialDays > 0
                            ? `Start ${trialDays}-Day Free Trial`
                            : `Choose ${plan.name}`}
                        </span>
                        <ArrowRight className="size-3 text-current opacity-70" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security & Billing Assurance */}
      <div className="mt-14 flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <ShieldCheck className="size-4 text-primary" />
        <span>Billed through Shopify Application Charges • Zero extra processing fees • Instant activation</span>
      </div>
    </div>
  );
}
