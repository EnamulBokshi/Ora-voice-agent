'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { Loader2, BarChart2 } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-muted-foreground" size={18} />
          <span className="text-sm font-medium">Loading usage quotas…</span>
        </div>
      </div>
    );
  }

  const effectiveSubscription: SubscriptionDetailsResponse = subscription ?? {
    plan: null,
    subscription: null,
    usage: {
      conversationMinutes: 0,
      ordersPerMonth: 0,
    },
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

        {/* ── Page Header: Title and Icon in one row, concise subheading ── */}
        <div className="border-b border-border/40 pb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
              <BarChart2 size={15} className="text-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Usage
            </h1>
          </div>
          <p className="text-xs sm:text-[13px] text-muted-foreground">
            Monitor real-time voice minutes, order capacity, and tier limits.
          </p>
        </div>

        {/* ── Functional Dashboard ── */}
        <UsageDashboard subscription={effectiveSubscription} />

      </div>
    </div>
  );
}

export function UsageClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Usage…</div>}>
      <UsageClientContent />
    </Suspense>
  );
}
