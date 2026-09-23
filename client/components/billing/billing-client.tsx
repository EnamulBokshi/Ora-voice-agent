'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardPage } from '@/components/dashboard/dashboard-page';
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
    <DashboardPage
      title="Plans & Billing"
      onRefresh={load}
      isRefreshing={loading}
      loading={loading && !subscription}
      loadingLabel="Loading plans & billing…"
    >
      {errorBanner}

      {/* ── Trial Reminder & Expiration Warning Banner ── */}
      <TrialReminderBanner
        subscription={effectiveSubscription}
        onSubscribed={load}
        isExpiredParam={isExpiredParam}
      />

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
    </DashboardPage>
  );
}

export function BillingClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Plans & Billing…</div>}>
      <BillingClientContent />
    </Suspense>
  );
}
