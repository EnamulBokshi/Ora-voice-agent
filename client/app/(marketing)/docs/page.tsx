import { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';
import { DocsPageClient } from '@/components/docs/docs-page-client';

export const metadata: Metadata = {
  title: 'Storefront Setup & Integration Guide — ORA Voice AI',
  description:
    'Step-by-step setup guides for integrating ORA onto Shopify, WooCommerce, Next.js, and custom storefronts. Learn how to customize widget appearance and sync product catalogs.',
  keywords: [
    'ORA setup guide',
    'Shopify voice assistant setup',
    'WooCommerce voice AI',
    'storefront widget embed',
    'conversational commerce setup',
    'product catalog sync'
  ],
  openGraph: {
    title: 'ORA Storefront Setup & Integration Guide',
    description: 'Learn how to integrate ORA onto your online storefront and start selling with voice in minutes.',
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
