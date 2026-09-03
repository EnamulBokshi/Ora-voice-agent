import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SetupGuideClient } from '@/components/setup/setup-guide-client';

export const metadata: Metadata = {
  title: 'Setup Guide | ORA Command Center',
  description: 'Step-by-step onboarding guide to configure persona, knowledge base, integrations, and live voice for your store.',
};

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Setup Guide...</div>}>
      <SetupGuideClient />
    </Suspense>
  );
}
