import type { Metadata } from 'next';
import { UsageClient } from '@/components/billing/usage-client';

export const metadata: Metadata = {
  title: 'Usage & Quota Limits | ORA Command Center',
  description:
    'Monitor real-time voice minutes, order quotas, and capacity limits.',
};

export default function UsagePage() {
  return <UsageClient />;
}
