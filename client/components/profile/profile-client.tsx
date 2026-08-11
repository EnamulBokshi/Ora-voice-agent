'use client';

import { ProfileHeader } from './profile-header';
import { MerchantInfoCard } from './merchant-info-card';
import { TeamMembersCard } from './team-members-card';
import { SecurityApiKeysCard } from './security-api-keys-card';

export function ProfileClient() {
  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
      {/* Header */}
      <ProfileHeader />

      {/* Merchant Identity Form Card */}
      <MerchantInfoCard />

      {/* Grid Row 2: Team Members & Security API Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamMembersCard />
        <SecurityApiKeysCard />
      </div>
    </div>
  );
}
