import type { Metadata } from 'next';
import { OrdersClient } from '@/components/orders/orders-client';

export const metadata: Metadata = {
  title: 'Orders & Sales History — ORA Command Center',
  description:
    'Track orders influenced and generated through the ORA AI sales assistant. View status and transaction history.',
};

export default function OrdersPage() {
  return <OrdersClient />;
}
