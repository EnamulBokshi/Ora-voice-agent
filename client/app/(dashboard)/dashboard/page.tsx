import type { Metadata } from 'next';
import { OverviewClient } from '@/components/overview/overview-client';

export const metadata: Metadata = {
  title: 'Dashboard — ORA',
  description:
    'Your ORA merchant dashboard. See how your AI sales agent is performing — orders, conversations, catalog health, and plan at a glance.',
};

export default function DashboardPage() {
  return <OverviewClient />;
}
