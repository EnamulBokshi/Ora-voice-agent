import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { ConversationsClient } from '@/components/conversations/conversations-client';

export const metadata: Metadata = {
  title: 'Conversations — ORA Command Center',
  description:
    'Monitor, inspect, and analyze customer conversations handled by your ORA AI sales agent.',
};

export default function ConversationsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="conversations" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="Conversations" activeTab="conversations" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <ConversationsClient />
        </main>
      </div>
    </div>
  );
}
