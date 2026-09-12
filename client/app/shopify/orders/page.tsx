import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Orders | Shopify',
};

export default function ShopifyOrdersPage() {
  redirect('/shopify/live-desk');
}
