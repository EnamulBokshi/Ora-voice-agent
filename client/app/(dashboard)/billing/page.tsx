import type { Metadata } from 'next';
import { BillingClient } from '@/components/billing/billing-client';

export const metadata: Metadata = {
  title: 'Plans & Billing | ORA Command Center',
  description:
    'Manage your active subscription tier, track trial and usage quotas, and access payment receipts.',
};

export default function BillingPage() {
  return <BillingClient />;
}
