import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { AgentClient } from '@/components/agent/agent-client';

export const metadata: Metadata = {
  title: 'ORA Agent & Knowledge Base — ORA Command Center',
  description:
    'Give ORA the information it needs to answer customer questions accurately. Manage store policies, shipping, returns, and AI grounding citations.',
};

export default function AgentPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="agent" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="ORA Agent & Knowledge Base" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <AgentClient />
        </main>
      </div>
    </div>
  );
}
