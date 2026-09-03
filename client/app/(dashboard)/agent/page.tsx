import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AgentClient } from '@/components/agent/agent-client';

export const metadata: Metadata = {
  title: 'ORA Agent | Feed Your Agent',
  description:
    'Feed ORA your business info, product details, and documents by voice, file upload, or text, and tune its persona.',
};

export default function AgentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading ORA Agent...</div>}>
      <AgentClient />
    </Suspense>
  );
}
