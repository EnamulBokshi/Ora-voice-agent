import { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersClient } from '@/components/orders/orders-client';

export const metadata: Metadata = {
  title: 'Orders | ORA Dashboard',
  description: 'View and manage all orders assisted by ORA.',
};

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersClient />
    </Suspense>
  );
}
