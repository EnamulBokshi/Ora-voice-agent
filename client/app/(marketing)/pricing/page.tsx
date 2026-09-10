import { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingNavbar } from '@/components/marketing/navbar';
import { MarketingFooter } from '@/components/marketing/footer';
import { PricingPageClient } from '@/components/pricing/pricing-page-client';
import { JsonLd, oraSoftwareSchema } from '@/components/marketing/json-ld';

export const metadata: Metadata = {
  title: 'Pricing & Subscription Plans | ORA AI Sales Assistant',
  description:
    'Choose your ORA AI subscription plan. Multimodal 24/7 conversational voice agent with live product catalog intelligence and automated checkout.',
  alternates: {
    canonical: 'https://tryora.live/pricing',
  },
  openGraph: {
    title: 'Pricing & Subscription Plans | ORA AI Sales Assistant',
    description: 'Explore the Free, Growth, and Scale tiers in USD & BDT. Start free today.',
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
