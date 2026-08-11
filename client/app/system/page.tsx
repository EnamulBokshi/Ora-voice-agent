import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { SystemClient } from '@/components/system/system-client';

export const metadata: Metadata = {
  title: 'System & Data Sources — ORA Command Center',
  description:
    'Connect your store integrations, Shopify, WooCommerce, custom APIs, and monitor data sync health across your ORA Sales Command Center.',
};

export default function SystemPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="system" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="System & Data Sources" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <SystemClient />
        </main>
      </div>
    </div>
  );
}
