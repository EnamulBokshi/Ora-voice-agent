import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SETUP_GUIDE_ENABLED } from '@/lib/disabled-features';

// DISABLED: the Get Set Up guide is switched off — see lib/disabled-features.ts.
// The route file and the guide's components are kept rather than deleted so a
// later merge cannot restore the feature without a visible conflict here.
// import { Suspense } from 'react';
// import { SetupGuideClient } from '@/components/setup/setup-guide-client';

export const metadata: Metadata = {
  title: 'Setup Guide | ORA Command Center',
  description: 'Step-by-step onboarding guide to configure persona, knowledge base, integrations, and live voice for your store.',
};

export default function SetupPage() {
  if (!SETUP_GUIDE_ENABLED) {
    // Answers 404 rather than rendering, so a bookmarked or linked /setup URL
    // cannot reach a guide the product no longer offers.
    notFound();
  }

  // return (
  //   <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Setup Guide...</div>}>
  //     <SetupGuideClient />
  //   </Suspense>
  // );
  return null;
}
