'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
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

function BillingClientContent() {
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
          <span className="text-sm font-medium">Loading invoices & plan…</span>
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
              <Receipt size={14} className="text-foreground" />
            </div>
            <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground">
              ORA Active Operations
            </span>
          </div>

          <h1 className="text-[24px] sm:text-[28px] font-semibold text-foreground font-serif tracking-tight leading-[1.2] mb-1.5">
            Invoices & Subscription
          </h1>

          <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
            Manage your active store subscription, view pricing tiers, and access downloadable tax receipts.
          </p>
        </div>

        {/* ── Functional Cards ── */}
        <CurrentPlanCard subscription={effectiveSubscription} onReload={load} />
        <PlanComparisonGrid
          currentPlanId={effectiveSubscription.plan?.planId ?? null}
          onSubscribed={load}
        />
        <InvoiceHistory invoices={invoices} onResent={load} />

      </div>
    </div>
  );
}

export function BillingClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Invoices…</div>}>
      <BillingClientContent />
    </Suspense>
  );
}
