import { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';
import { DocsPageClient } from '@/components/docs/docs-page-client';

export const metadata: Metadata = {
  title: 'Documentation & API Reference — ORA Autonomous AI Sales Assistant',
  description:
    'Complete documentation, Web Audio SDK integration guides, Shopify and WooCommerce connectors, REST API reference, and real-time voice streaming specifications for ORA.',
  keywords: [
    'ORA documentation',
    'AI sales agent API',
    'voice widget SDK',
    'cart recovery API',
    'Shopify AI integration',
    'Gemini Live streaming',
    'conversational commerce SDK'
  ],
  openGraph: {
    title: 'ORA Developer Documentation & API Reference',
    description: 'Learn how to integrate ORA onto your online storefront and build autonomous sales workflows.',
    type: 'website',
  },
};

export default function DocsPage() {
  return (
    <>
      <MarketingNavbar />
      <Suspense fallback={<div className="min-h-screen pt-24 text-center text-sm text-muted-foreground">Loading documentation...</div>}>
        <DocsPageClient />
      </Suspense>
      <MarketingFooter />
    </>
  );
}
