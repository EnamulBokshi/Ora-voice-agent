'use client';

import React, { useState } from 'react';
import { subscribeShopifyBillingApi } from '@/services/billing-service';
import { Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

interface PlanOption {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  highlighted?: boolean;
  features: string[];
}

const SHOPIFY_PLANS: PlanOption[] = [
  {
    id: 'starter',
    name: 'Starter Agent',
    price: '$49',
    period: '/month',
    description: 'Perfect for growing stores wanting 24/7 AI voice sales on their storefront.',
    features: [
      '500 AI voice sales minutes / month',
      'Instant Shopify Catalog & Inventory sync',
      'Smart product recommendations & cart add',
      'Standard conversational response speed (<1s)',
      '14-Day Free Trial included',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Pro',
    price: '$99',
    period: '/month',
    description: 'For busy stores looking to maximize average order value and checkout conversions.',
    highlighted: true,
    features: [
      '1,500 AI voice sales minutes / month',
      'Real-time Live Desk & call takeover',
      'Custom persona & brand tone tuning',
      'Multi-language customer auto-detection',
      'Priority Gemini Live voice model pipeline',
      '14-Day Free Trial included',
    ],
  },
  {
    id: 'scale',
    name: 'Scale & High-Volume',
    price: '$249',
    period: '/month',
    description: 'For high-volume merchants with large catalogs and high peak-hour call volume.',
    features: [
      '5,000 AI voice sales minutes / month',
      'Unlimited catalog items & SKU indexing',
      'Dedicated concurrency channels',
      'VIP onboarding & custom system prompt design',
      '14-Day Free Trial included',
    ],
  },
];

export function ShopifyPlanGate() {
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          Turn store visitors into buyers with real-time voice guidance. Start with a 14-day free trial on any plan. Cancel anytime from your Shopify Admin.
        </p>
      </div>

      {error && (
        <div className="max-w-md w-full mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
        {SHOPIFY_PLANS.map((plan) => {
          const isPending = subscribingId === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                plan.highlighted
                  ? 'border-primary/60 bg-surface-container shadow-2xl ring-1 ring-primary/40'
                  : 'border-border bg-surface-lowest hover:border-border/80'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-mono font-semibold">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground font-mono">{plan.period}</span>
                </div>

                <div className="border-t border-border/50 pt-4 space-y-2.5">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">What's included</p>
                  <ul className="space-y-2">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90">
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
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 ${
                    plan.highlighted
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
                    <span>Start 14-Day Free Trial</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security & Billing Assurance */}
      <div className="mt-12 flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span>Billed securely through your Shopify Account. 0% credit card fees.</span>
      </div>
    </div>
  );
}
