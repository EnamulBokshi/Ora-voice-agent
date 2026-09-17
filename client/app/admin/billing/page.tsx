import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { AdminBillingView } from '@/components/admin/billing/admin-billing-view';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Subscription & Billing Engine | ORA SuperAdmin',
  description:
    'Lifecycle subscription management, multi-currency plan tiers, real-time MRR telemetry, and promotional coupon engine.',
};

export default function AdminBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AdminBillingView />
    </Suspense>
  );
}
