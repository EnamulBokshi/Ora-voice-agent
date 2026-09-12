import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AgentClient } from '@/components/agent/agent-client';

export const metadata: Metadata = {
  title: 'ORA Agent | Shopify',
  description: 'Configure and tune your ORA voice sales persona for your Shopify store.',
};

export default function ShopifyAgentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground font-mono">Loading ORA Agent...</div>}>
      <AgentClient />
    </Suspense>
  );
}
