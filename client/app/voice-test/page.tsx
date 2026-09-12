import type { Metadata } from 'next';

import { VoiceTestStandalone } from '@/components/voice/voice-test-standalone';

export const metadata: Metadata = {
  title: 'Voice Test | ORA',
  description: 'Talk to your ORA voice agent outside the Shopify admin frame.',
  robots: { index: false, follow: false },
};

export default function VoiceTestPage() {
  return <VoiceTestStandalone />;
}
