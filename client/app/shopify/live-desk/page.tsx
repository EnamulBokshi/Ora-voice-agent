import type { Metadata } from 'next';
import { LiveDeskClient } from '@/components/live-desk/live-desk-client';

export const metadata: Metadata = {
  title: 'Live Desk | Shopify',
  description: 'Monitor active voice sessions and live customer interactions.',
};

export default function ShopifyLiveDeskPage() {
  return <LiveDeskClient />;
}
