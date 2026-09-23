'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { DashboardPage } from '@/components/dashboard/dashboard-page';
import { getSubscriptionApi } from '@/services/billing-service';
import { demoSubscription } from '@/lib/demo-data';
import { withDemoFallback } from '@/lib/demo-config';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { UsageDashboard } from './usage-dashboard';

function UsageClientContent() {
  const [subscription, setSubscription] = useState<SubscriptionDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The inline .catch(() => null) here hid every failure from the outer catch, so
      // setError was only ever called with null and the `if (error)` branch below was
      // dead code. A failed call rendered "Free Tier" and zero usage as if true.
      const sub = await getSubscriptionApi();
      setSubscription(withDemoFallback(sub, demoSubscription));
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not load your usage quotas: ${err.message}`
          : 'Could not load your usage quotas. Your plan has not changed — retry to see current limits.',
      );
      setSubscription(withDemoFallback(null, demoSubscription));
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
  };

  // Shown above the content rather than replacing it: a stale plan with a visible
  // warning is more useful to a merchant than a blank screen.
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
      title="Usage"
      onRefresh={load}
      isRefreshing={loading}
      loading={loading && !subscription}
      loadingLabel="Loading usage…"
    >
      {errorBanner}
      <UsageDashboard subscription={effectiveSubscription} />
    </DashboardPage>
  );
}

export function UsageClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Usage…</div>}>
      <UsageClientContent />
    </Suspense>
  );
}
