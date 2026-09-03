import type { Metadata } from 'next';
import { ConversationsClient } from '@/components/conversations/conversations-client';

export const metadata: Metadata = {
  title: 'Conversations | ORA Command Center',
  description:
    'Monitor, inspect, and analyze customer conversations handled by your ORA AI sales agent.',
};

export default function ConversationsPage() {
  return <ConversationsClient />;
}
