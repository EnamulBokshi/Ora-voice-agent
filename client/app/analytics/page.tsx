import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { AnalyticsClient } from '@/components/analytics/analytics-client';

export const metadata: Metadata = {
  title: 'Analytics & Revenue Performance — ORA Command Center',
  description:
    'Understand how ORA turns customer conversations into sales. Track conversation-to-revenue funnel, intent conversion, channel performance, and top products.',
};

export default function AnalyticsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="analytics" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="Analytics & Revenue Performance" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <AnalyticsClient />
        </main>
      </div>
    </div>
  );
}
