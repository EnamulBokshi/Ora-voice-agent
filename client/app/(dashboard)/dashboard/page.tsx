import type { Metadata } from 'next';
import { OverviewClient } from '@/components/overview/overview-client';

export const metadata: Metadata = {
  title: 'Dashboard | ORA',
  description:
    'Your ORA merchant dashboard. Track orders, conversations, catalog health, and plan usage at a glance.',
};

export default function DashboardPage() {
  return <OverviewClient />;
}
