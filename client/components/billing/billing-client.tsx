'use client';

import { BillingHeader } from './billing-header';
import { CurrentPlanCard } from './current-plan-card';
import { CurrentUsageBars } from './current-usage-bars';
import { PlanComparisonGrid } from './plan-comparison-grid';
import { PaymentAndHistory } from './payment-and-history';

export function BillingClient() {
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <BillingHeader />

      {/* Current Active Plan & System Health */}
      <CurrentPlanCard />

      {/* Quota Usage Bars */}
      <CurrentUsageBars />

      {/* Plan Comparison Tiers */}
      <PlanComparisonGrid />

      {/* Payment Method & Invoices History */}
      <PaymentAndHistory />
    </div>
  );
}
