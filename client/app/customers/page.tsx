import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { CustomersClient } from '@/components/customers/customers-client';

export const metadata: Metadata = {
  title: 'Customers & CRM — ORA Command Center',
  description:
    'Understand the customers ORA is helping, nurturing, and converting. Inspect purchase intent, context, interests, and customer journeys.',
};

export default function CustomersPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="customers" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="Customers & CRM" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <CustomersClient />
        </main>
      </div>
    </div>
  );
}
