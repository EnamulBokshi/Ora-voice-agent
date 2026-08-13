import type { Metadata } from 'next';
import { AgentClient } from '@/components/agent/agent-client';

export const metadata: Metadata = {
  title: 'Agent Setup — ORA Command Center',
  description:
    'Configure ORA voice & persona settings, tune prompt instructions, and test live real-time voice streaming.',
};

export default function AgentPage() {
  return <AgentClient />;
}
