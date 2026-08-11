import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { BillingClient } from '@/components/billing/billing-client';

export const metadata: Metadata = {
  title: 'Billing & Subscriptions — ORA Command Center',
  description:
    'Manage your ORA subscription tier, usage quotas, payment methods, and invoices.',
};

export default function BillingPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="billing" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="Billing & Subscriptions" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <BillingClient />
        </main>
      </div>
    </div>
  );
}
