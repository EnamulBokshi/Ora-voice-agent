import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Settings | Shopify',
};

export default function ShopifyProfilePage() {
  redirect('/shopify/settings');
}

