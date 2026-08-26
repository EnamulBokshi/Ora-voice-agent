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
      const sub = await getSubscriptionApi().catch(() => null);
      setSubscription(withDemoFallback(sub, demoSubscription));
    } catch (err) {
      console.error('Failed to load usage details:', err);
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

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-sm text-muted-foreground px-6">
        {error}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar w-full bg-background">
      <div className="w-full px-4 sm:px-6 py-5 space-y-6">

        {/* ── Editorial Header (Matching ORA Agent & Setup pages) ── */}
        <div className="border-b border-border/40 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
              <BarChart2 size={14} className="text-foreground" />
            </div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground">
              ORA Active Operations
            </span>
          </div>

          <h1 className="text-[24px] sm:text-[28px] font-semibold text-foreground font-serif tracking-tight leading-[1.2] mb-1.5">
            Usage & Quota Limits
          </h1>

          <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
            Monitor real-time voice conversation minutes, checkout orders influenced, and provisioned storefront capacity.
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
