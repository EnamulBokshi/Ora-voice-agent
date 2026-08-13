'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { getSubscriptionApi, getBillingPlansApi } from '@/services/billing-service';
import { getInvoicesApi } from '@/services/invoices-service';
import { demoSubscription, demoInvoices, demoPlans } from '@/lib/demo-data';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { Invoice } from '@/types/invoices';
import { BillingHeader } from './billing-header';
import { CurrentPlanCard } from './current-plan-card';
import { PlanComparisonGrid } from './plan-comparison-grid';
import { InvoiceHistory } from './invoice-history';

export function BillingClient() {
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
      setSubscription(sub ?? demoSubscription);
      setInvoices(inv?.items && inv.items.length > 0 ? inv.items : demoInvoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing');
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
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-sm font-medium">Loading billing...</span>
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-sm text-muted-foreground px-6">
        {error ?? 'Billing unavailable.'}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 w-full">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <BillingHeader />
        <CurrentPlanCard subscription={subscription} onReload={load} />
        <PlanComparisonGrid
          currentPlanId={subscription.plan?.planId ?? null}
          onSubscribed={load}
        />
        <InvoiceHistory invoices={invoices} onResent={load} />
      </div>
    </div>
  );
}
