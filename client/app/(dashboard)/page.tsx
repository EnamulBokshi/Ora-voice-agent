import type { Metadata } from 'next';
import { OverviewClient } from '@/components/overview/overview-client';

export const metadata: Metadata = {
  title: 'Overview — ORA Command Center',
  description:
    'Monitor your ORA AI sales agent. Track conversations, orders, catalog, and plan status from real data.',
};

export default function OverviewPage() {
  return <OverviewClient />;
}
