'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Receipt } from 'lucide-react';
import { getSubscriptionApi } from '@/services/billing-service';
import { getInvoicesApi } from '@/services/invoices-service';
import { demoSubscription, demoInvoices } from '@/lib/demo-data';
import { withDemoFallback } from '@/lib/demo-config';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { Invoice } from '@/types/invoices';
import { CurrentPlanCard } from './current-plan-card';
import { PlanComparisonGrid } from './plan-comparison-grid';
import { InvoiceHistory } from './invoice-history';
import { TrialReminderBanner } from './trial-reminder-banner';

function BillingClientContent() {
  const searchParams = useSearchParams();
  const isExpiredParam = searchParams.get('expired') === 'true';

  const [subscription, setSubscription] = useState<SubscriptionDetailsResponse | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, invRes] = await Promise.allSettled([
        getSubscriptionApi(),
        getInvoicesApi({ page: 1, limit: 20 }),
      ]);

      const sub = subRes.status === 'fulfilled' ? subRes.value : null;
      const inv = invRes.status === 'fulfilled' ? invRes.value : null;

      setSubscription(withDemoFallback(sub, demoSubscription));
      setInvoices(withDemoFallback(inv?.items, demoInvoices));

      if (subRes.status === 'rejected') {
        setError(
          'Could not load your plan and usage. Your subscription has not changed — retry to see current details.',
        );
      } else if (invRes.status === 'rejected') {
        setError('Your plan loaded, but invoices could not be fetched. Retry to see them.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-muted-foreground" size={18} />
          <span className="text-sm font-medium">Loading plans & billing…</span>
        </div>
      </div>
    );
  }

  const effectiveSubscription: SubscriptionDetailsResponse = subscription ?? {
    plan: null,
    subscription: null,
    usage: {
      voiceMinutes: 0,
      documentCount: 0,
      websiteCount: 1,
      conversationMinutes: 0,
      ordersPerMonth: 0,
    },
    hasUsedTrial: false,
    isTrialing: false,
  };

  const errorBanner = error ? (
    <div className="flex items-start justify-between gap-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3">
      <p className="text-[12.5px] text-foreground">{error}</p>
      <button
        type="button"
        onClick={load}
        className="shrink-0 inline-flex items-center h-7 px-3 rounded-md border border-border/60 bg-surface-high/40 hover:bg-surface-high text-[12px] font-medium text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Retry
      </button>
    </div>
  ) : null;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full bg-background">
      <div className="w-full px-4 sm:px-6 py-5 space-y-6">

        {errorBanner}

        {/* ── Trial Reminder & Expiration Warning Banner ── */}
        <TrialReminderBanner
          subscription={effectiveSubscription}
          onSubscribed={load}
          isExpiredParam={isExpiredParam}
        />

        {/* ── Editorial Header (Matching ORA Agent & Setup pages) ── */}
        <div className="border-b border-border/40 pb-5">
          {/* <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
              <Receipt size={14} className="text-foreground" />
            </div>
          </div> */}

          <h1 className="text-[24px] sm:text-[28px] font-semibold text-foreground font-serif tracking-tight leading-[1.2] mb-1.5">
            Plans & Billing
          </h1>

          {/* <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
            Manage your active subscription tier, track trial and usage quotas, and access payment receipts.
          </p> */}
        </div>

        {/* ── Functional Cards ── */}
        <CurrentPlanCard subscription={effectiveSubscription} onReload={load} />

        <PlanComparisonGrid
          currentPlanId={effectiveSubscription.plan?.planId ?? null}
          onSubscribed={load}
          hasUsedTrial={effectiveSubscription.hasUsedTrial}
          isTrialing={effectiveSubscription.subscription?.status === 'trialing'}
          trialDaysRemaining={effectiveSubscription.trialDaysRemaining}
        />

        <InvoiceHistory invoices={invoices} onResent={load} />

      </div>
    </div>
  );
}

export function BillingClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Plans & Billing…</div>}>
      <BillingClientContent />
    </Suspense>
  );
}
