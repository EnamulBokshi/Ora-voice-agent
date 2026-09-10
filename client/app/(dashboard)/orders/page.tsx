import type { Metadata } from 'next';
import { OrdersClient } from '@/components/orders/orders-client';

export const metadata: Metadata = {
  title: 'Orders | ORA Command Center',
  description:
    'Orders placed by shoppers, including the ones ORA assisted.',
};

export default function OrdersPage() {
  return <OrdersClient />;
}
