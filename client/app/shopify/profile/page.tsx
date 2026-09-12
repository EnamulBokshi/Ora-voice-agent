import type { Metadata } from 'next';
import { ProfileClient } from '@/components/profile/profile-client';

export const metadata: Metadata = {
  title: 'Profile | Shopify',
  description: 'Your merchant account and store details.',
};

export default function ShopifyProfilePage() {
  return <ProfileClient />;
}
