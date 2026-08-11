import type { Metadata } from 'next';
import { Sidebar }              from '@/components/dashboard/sidebar';
import { LiveActivityClient }   from '@/components/live-activity/live-activity-client';

export const metadata: Metadata = {
  title: 'Live Activity — ORA Command Center',
  description:
    'Monitor in real time what your ORA AI sales agent is doing — active conversations, voice sessions, product searches, cart actions, and orders.',
};

export default function LiveActivityPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="live-activity" />

      {/* Main area — offset by sidebar, full-height, no overflow (drawer is absolute inside) */}
      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <LiveActivityClient />
      </div>
    </div>
  );
}
