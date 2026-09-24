import { Metadata } from 'next';
import { Suspense } from 'react';
import { League_Gothic } from 'next/font/google';
import { Start2Nav } from '@/components/marketing/start2/start2-nav';
import { Start2Pricing } from '@/components/marketing/start2/start2-pricing';
import { Start2Footer } from '@/components/marketing/start2/start2-footer';
import { JsonLd, oraSoftwareSchema } from '@/components/marketing/json-ld';
import '../start2.css';

const heroFont = League_Gothic({
  subsets: ['latin'],
  variable: '--font-hero',
  display: 'swap',
});

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
      <div className={`start2-landing ${heroFont.variable}`}>
        <Start2Nav />
        <main id="main-content" style={{ minHeight: '80vh', paddingBottom: '3rem' }}>
          <Suspense
            fallback={
              <div
                className="s2p-wrap"
                style={{
                  paddingTop: '80px',
                  textAlign: 'center',
                  color: 'var(--s2-text-secondary)',
                }}
              >
                Loading pricing plans...
              </div>
            }
          >
            <Start2Pricing />
          </Suspense>
        </main>
        <Start2Footer />
      </div>
    </>
  );
}
