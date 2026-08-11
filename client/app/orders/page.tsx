import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { OrdersClient } from '@/components/orders/orders-client';

export const metadata: Metadata = {
  title: 'Orders & Sales History — ORA Command Center',
  description:
    'Track orders influenced and generated through ORA AI Sales Assistant. View attribution details, status, and transaction history.',
};

export default function OrdersPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="orders" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="Orders & Sales History" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <OrdersClient />
        </main>
      </div>
    </div>
  );
}
