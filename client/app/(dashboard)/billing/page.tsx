import type { Metadata } from 'next';
import { BillingClient } from '@/components/billing/billing-client';

export const metadata: Metadata = {
  title: 'Billing & Subscriptions | ORA Command Center',
  description:
    'Manage your ORA subscription tier and invoices.',
};

export default function BillingPage() {
  return <BillingClient />;
}
