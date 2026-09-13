import type { Metadata } from 'next';
import { OrdersClient } from '@/components/orders/orders-client';

export const metadata: Metadata = {
  title: 'Orders | Shopify',
  description: 'Orders placed by shoppers, including real-time voice-attributed sales.',
};

export default function ShopifyOrdersPage() {
  return <OrdersClient />;
}

