import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AgentClient } from '@/components/agent/agent-client';

export const metadata: Metadata = {
  title: 'System Configuration | Shopify',
  description: 'Configure voice persona, sales playbooks, knowledge, and store settings.',
};

export default function ShopifyAgentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground font-mono">Loading ORA Agent...</div>}>
      <AgentClient />
    </Suspense>
  );
}
