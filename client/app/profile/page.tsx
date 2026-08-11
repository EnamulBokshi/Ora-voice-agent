import type { Metadata } from 'next';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopNav } from '@/components/dashboard/top-nav';
import { ProfileClient } from '@/components/profile/profile-client';

export const metadata: Metadata = {
  title: 'Merchant Profile & Settings — ORA Command Center',
  description:
    'Manage your store identity, domain details, team roles, API keys, and security settings.',
};

export default function ProfilePage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage="profile" />

      <div className="flex-1 ml-[280px] flex flex-col h-full overflow-hidden">
        <TopNav greeting="Merchant Profile & Settings" />

        <main className="flex-1 pt-16 h-[calc(100vh-64px)] flex overflow-hidden">
          <ProfileClient />
        </main>
      </div>
    </div>
  );
}
