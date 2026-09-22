import { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';
import { DocsPageClient } from '@/components/docs/docs-page-client';

export const metadata: Metadata = {
  title: 'Setup & Integration Guide | ORA Voice AI',
  description:
    'Step-by-step guides for adding ORA to any website, plus Shopify, WooCommerce and Next.js. Customise the widget, teach the agent and sync a catalogue if you have one.',
  keywords: [
    'ORA setup guide',
    'voice AI widget embed',
    'add voice agent to website',
    'Shopify voice assistant setup',
    'WooCommerce voice AI',
    'knowledge base setup',
  ],
  alternates: {
    canonical: 'https://tryora.live/docs',
  },
  openGraph: {
    title: 'ORA Setup & Integration Guide',
    description: 'Add ORA to your website and have it answering visitors in minutes.',
    url: 'https://tryora.live/docs',
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
