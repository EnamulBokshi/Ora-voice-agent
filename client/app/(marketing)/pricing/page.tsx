import { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';
import { PricingPageClient } from '@/components/pricing/pricing-page-client';
import { JsonLd, oraSoftwareSchema } from '@/components/marketing/json-ld';

export const metadata: Metadata = {
  title: 'Pricing | ORA Voice AI',
  description:
    'Free, Growth and Scale plans in USD and BDT. A voice AI agent for any business with a website. Start free.',
  alternates: {
    canonical: 'https://tryora.live/pricing',
  },
  openGraph: {
    title: 'Pricing | ORA Voice AI',
    description: 'Free, Growth and Scale tiers in USD and BDT. Start free today.',
    url: 'https://tryora.live/pricing',
    type: 'website',
  },
};

export default function PricingPage() {
  return (
    <>
      <JsonLd data={oraSoftwareSchema} />
      <MarketingNavbar />
      <Suspense fallback={<div className="min-h-screen pt-24 text-center text-sm text-muted-foreground">Loading pricing tiers...</div>}>
        <PricingPageClient />
      </Suspense>
      <MarketingFooter />
    </>
  );
}
