import type { Metadata } from 'next';
import { NotificationsClient } from '@/components/notifications/notifications-client';

export const metadata: Metadata = {
  title: 'Notifications — ORA Command Center',
  description: 'Storefront events, shopper conversions, catalog sync updates, and system alerts.',
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
