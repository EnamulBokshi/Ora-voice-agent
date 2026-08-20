'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getSubscriptionApi, getBillingPlansApi } from '@/services/billing-service';
import { getInvoicesApi } from '@/services/invoices-service';
import { demoSubscription, demoInvoices, demoPlans } from '@/lib/demo-data';
import { withDemoFallback } from '@/lib/demo-config';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { Invoice } from '@/types/invoices';
import { BillingHeader } from './billing-header';
import { CurrentPlanCard } from './current-plan-card';
import { PlanComparisonGrid } from './plan-comparison-grid';
import { InvoiceHistory } from './invoice-history';
import { UsageDashboard } from './usage-dashboard';

function BillingClientContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const isUsageTab = tab === 'usage';

  const [subscription, setSubscription] = useState<SubscriptionDetailsResponse | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sub, inv] = await Promise.all([
        getSubscriptionApi().catch(() => null),
        getInvoicesApi({ page: 1, limit: 20 }).catch(() => null),
      ]);
      setSubscription(withDemoFallback(sub, demoSubscription));
      setInvoices(withDemoFallback(inv?.items, demoInvoices));
    } catch (err) {
      console.error('Failed to load billing details:', err);
      setSubscription(withDemoFallback(null, demoSubscription));
      setInvoices(withDemoFallback(null, demoInvoices));
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
          <span className="text-sm font-medium">Loading billing details…</span>
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
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 w-full bg-background">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <BillingHeader />
        {isUsageTab ? (
          <UsageDashboard subscription={effectiveSubscription} />
        ) : (
          <>
            <CurrentPlanCard subscription={effectiveSubscription} onReload={load} />
            <PlanComparisonGrid
              currentPlanId={effectiveSubscription.plan?.planId ?? null}
              onSubscribed={load}
            />
            <InvoiceHistory invoices={invoices} onResent={load} />
          </>
        )}
      </div>
    </div>
  );
}

export function BillingClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Billing…</div>}>
      <BillingClientContent />
    </Suspense>
  );
}
