import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { SalesClient } from '@/components/sales/sales-client';

export const metadata: Metadata = {
  title: 'Sales Playbook — ORA Command Center',
  description:
    'Define the strategies, upsell rules, and AI prioritization weights ORA uses to turn conversations into sales.',
};

export default function SalesPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="sales" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="Sales Playbook" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <SalesClient />
        </main>
      </div>
    </div>
  );
}
