import type { Metadata } from 'next';
import { ConversationsClient } from '@/components/conversations/conversations-client';

export const metadata: Metadata = {
  title: 'Conversations | Shopify',
  description: 'Monitor, inspect, and analyze customer conversations handled by your ORA AI sales agent.',
};

export default function ShopifyConversationsPage() {
  return <ConversationsClient />;
}
