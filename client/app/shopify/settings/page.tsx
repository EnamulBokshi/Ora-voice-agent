import type { Metadata } from 'next';
import { ProfileClient } from '@/components/profile/profile-client';

export const metadata: Metadata = {
  title: 'Settings | Shopify',
  description: 'Manage store credentials, publishable API keys, and account settings.',
};

export default function ShopifySettingsPage() {
  return <ProfileClient />;
}
