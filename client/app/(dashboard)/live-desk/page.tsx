import type { Metadata } from 'next';
import { LiveDeskClient } from '@/components/live-desk/live-desk-client';

export const metadata: Metadata = {
  title: 'Live Desk — ORA Command Center',
  description:
    'Monitor active voice and chat conversations, channel integration health, and real-time fallback flags.',
};

export default function LiveDeskPage() {
  return <LiveDeskClient />;
}
