'use client';

import { Receipt } from 'lucide-react';

export function BillingHeader() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2.5">
        <Receipt size={18} className="text-muted-foreground" />
        Billing & Subscriptions
      </h1>
      <p className="text-[13px] text-muted-foreground mt-1">
        Your plan, usage, and invoice history.
      </p>
    </div>
  );
}
