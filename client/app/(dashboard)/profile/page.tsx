import type { Metadata } from 'next';
import { ProfileClient } from '@/components/profile/profile-client';

export const metadata: Metadata = {
  title: 'Profile | ORA Command Center',
  description:
    'Your merchant account and user details.',
};

export default function ProfilePage() {
  return <ProfileClient />;
}
