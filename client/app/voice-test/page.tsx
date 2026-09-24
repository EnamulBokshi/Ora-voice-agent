import type { Metadata } from 'next';

import { VoiceTestStandalone } from '@/components/voice/voice-test-standalone';

export const metadata: Metadata = {
  title: 'Train & Test ORA | ORA',
  description: 'Train and test your ORA voice agent by talking, outside the Shopify admin frame.',
  robots: { index: false, follow: false },
};

export default function VoiceTestPage() {
  return <VoiceTestStandalone />;
}
